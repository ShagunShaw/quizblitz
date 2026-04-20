import { Server } from "socket.io"

interface QuestionData {
    time: number,
    question: String,
    options: [String],
    correctOption: number
}

interface Submissions {
    id: string,
    submittedOption: number,
    username: string,
    isAutoSubmit: boolean
}

interface Scores {
    id: string,
    username: string,
    currentPoint: number,
    streak: number
}

let io;
const quizRooms = {}

const initSocket = (server) => {
    io = new Server(server)

    function calculateResult(roomCode, correctOption) {
        const data = quizRooms[roomCode]
        let count = 0

        for (const val of data.submissions) {
            let givenMarks = 0

            // how this will handle millions of users in such a case, where it can to scan everytime for a new id?
            const player: Scores = data.scores.find(p => p.id === val.id)

            // give marks to each user accordingly
            if (val.submittedOption && val.submittedOption === correctOption) {

                if (val.isAutoSubmit) {
                    givenMarks = 1
                    if (player) player.streak = 0
                }
                else {
                    count++;

                    if (count == 1) givenMarks = 15;
                    else if (count == 2) givenMarks = 14;
                    else if (count == 3) givenMarks = 13;
                    else if (count == 4) givenMarks = 12;
                    else if (count == 5) givenMarks = 11;
                    else if (count == 6) givenMarks = 10;
                    else if (count == 7) givenMarks = 9;
                    else if (count >= 8 && count <= 17) givenMarks = 7
                    else if (count >= 18 && count <= 32) givenMarks = 5
                    else givenMarks = 3

                    if (player) player.streak += 1

                    if (player.streak == 3) givenMarks += 3
                    if (player.streak == 5) givenMarks += 4
                    if (player.streak == 10) givenMarks += 7
                }
            }
            else {
                if (player) player.streak = 0
            }

            player.currentPoint = givenMarks + player.currentPoint
            // for updating the top7 and topPoints array
            if (data.topPoints.length === 7) {
                if (player.currentPoint > data.topPoints[6]) {
                    for (let i = 0; i < data.topPoints.length; i++) {
                        if (data.topPoints[i] < player.currentPoint) {
                            data.topPoints.splice(i, 0, player.currentPoint)
                            data.top7.splice(i, 0, player.username)
                            break
                        }
                    }
                    data.top7.pop()
                    data.topPoints.pop()
                }
            }
            else {
                if (player.currentPoint > data.topPoints[data.topPoints.length - 1]) {
                    for (let i = 0; i < data.topPoints.length; i++) {
                        if (data.topPoints[i] < player.currentPoint) {
                            data.topPoints.splice(i, 0, player.currentPoint)
                            data.top7.splice(i, 0, player.username)
                            break
                        }
                    }
                }
                else {
                    data.topPoints.push(player.currentPoint)
                    data.top7.push(player.username)
                }
            }
        }

        data.isResultCalculated = true
    }

    io.on("connection", (socket) => {
        console.log("a user connected", socket.id)

        // see if you can make changes that rather attendee count ko baar baar calculate krne k jgh if we can store the value somewhere and increment it by 1 everytime a new attendee joins
        socket.on("attendeeJoinRoom", ({ roomCode, username }) => {
            socket.join(roomCode)
            socket.data.roomCode = roomCode
            socket.data.role = 'attendee'       // socket.data is a built-in Socket.io object — it's basically an empty object attached to every socket connection where you can store anything you want about that specific socket.

            const room = io.of("/").adapter.rooms.get(roomCode)
            let attendeeCount = 0

            room?.forEach(socketId => {
                const s = io.sockets.sockets.get(socketId)
                if (s?.data.role === 'attendee') attendeeCount++
            })

            if (!quizRooms[roomCode]) {
                quizRooms[roomCode] = {
                    currentQuestion: null,
                    isResultCalculated: false,
                    submissions: [],
                    timer: null,
                    scores: [],
                    top7: [],
                    topPoints: []
                }
            }

            quizRooms[roomCode].scores.push({
                id: socket.id,
                username: username,
                currentPoint: 0,
                streak: 0
            })

            io.to(roomCode).emit("AttendeeCount", { attendeeCount })
        })

        socket.on("hostJoinRoom", ({ roomCode }) => {
            socket.join(roomCode)
            socket.data.role = 'host'
            socket.data.roomCode = roomCode

            if (!quizRooms[roomCode]) {
                quizRooms[roomCode] = {
                    currentQuestion: null,
                    isResultCalculated: false,
                    submissions: [],
                    timer: null,
                    scores: [],
                    top7: [],
                    topPoints: []
                }
            }
        })

        socket.on("publishQuestion", ({ roomCode, questionData }) => {
            if(!quizRooms[roomCode]) return

            // subsequent questions — only update these, keep scores intact
            quizRooms[roomCode].currentQuestion = questionData as QuestionData
            quizRooms[roomCode].submissions = [] as Submissions[]
            quizRooms[roomCode].timer = null
            quizRooms[roomCode].isResultCalculated = false


            io.to(roomCode).emit("newQuestion", questionData)

            quizRooms[roomCode].timer = setTimeout(() => {
                if(!quizRooms[roomCode].isResultCalculated)    calculateResult(roomCode, questionData.correctOption)
                const player: Scores = quizRooms[roomCode].scores.find(p => p.id === socket.id)

                // see how we made use of option chaining properly; If player is undefined, doing player.username will throw 'Cannot read properties of undefined' before even reaching the || 'Host' fallback.
                io.to(roomCode).emit("displayScoreBoard", { username: player?.username || 'Host', userscore: player?.currentPoint ?? NaN, top7: quizRooms[roomCode].top7, topPoints: quizRooms[roomCode].topPoints })
            }, (questionData.time + 2) * 1000)
        })

        socket.on("submitAnswer", ({ roomCode, optionIndex, userName, isAutoSubmit }) => {       // to be called from frontend when someone clicks submit, or when auto-submit after the timer expires
            if (!quizRooms[roomCode]) return

            const arr = quizRooms[roomCode].submissions
            if (arr.some(d => d.id === socket.id)) return

            const data: Submissions = {
                id: socket.id,
                submittedOption: optionIndex,
                username: userName,
                isAutoSubmit: isAutoSubmit as boolean
            }
            quizRooms[roomCode].submissions.push(data)
        })

        socket.on("disconnect", () => {
            const roomCode = socket.data.roomCode
            if (!roomCode || !quizRooms[roomCode]) return

            quizRooms[roomCode].scores = quizRooms[roomCode].scores.filter(p => p.id !== socket.id)
            console.log("user disconnected", socket.id)
        })
    })
}

const getIO = () => {
    if (!io) throw new Error("Socket not initialized")
    return io
}

export { initSocket, getIO }