import { Server } from "socket.io"
import { Quiz } from "./schemas/quiz.schema.ts";
import logger from "./logger.ts";

interface QuestionData {
    time: number,
    question: string,
    options: [string],
    correctOption: number,
    questionNo: number
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
        try {
            const data = quizRooms[roomCode]
            let count = 0
            const stats = data.currentQuesStats      // which has currently {} in its default value

            for (const val of data.submissions) {
                let givenMarks = 0

                // how this will handle millions of users in such a case, where it can to scan everytime for a new id?
                const player: Scores = data.scores.find(p => p.id === val.id)

                if (val.submittedOption !== null && val.submittedOption !== undefined) {
                    stats[val.submittedOption] = (stats[val.submittedOption] !== undefined) ? stats[val.submittedOption] + 1 : 1
                    data.totalSubmission += 1
                }

                // give marks to each user accordingly
                if ((val.submittedOption !== null && val.submittedOption !== undefined) && val.submittedOption === correctOption) {
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

                logger.info("Individual Marks", {
                    roomCode: roomCode,
                    username: player.username,
                    previousPoints: player.currentPoint,
                    givenPoints: givenMarks,
                    updatedPoints: (givenMarks + player.currentPoint),
                    questionNo: data.currentQuestion.questionNo,
                    timestamp: new Date()
                })

                player.currentPoint = givenMarks + player.currentPoint

                // for updating the top7 and topPoints array
                const existingIndex = data.top7.indexOf(player.username)
                if (existingIndex !== -1) {     // (this part I missed)
                    // player already in top7 — just update their points
                    data.topPoints[existingIndex] = player.currentPoint

                    // re-sort both arrays together
                    const combined = data.top7.map((name, i) => ({ name, points: data.topPoints[i] }))
                    combined.sort((a, b) => b.points - a.points)

                    data.top7 = combined.map(c => c.name)
                    data.topPoints = combined.map(c => c.points)
                } else {
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
            }

            data.isResultCalculated = true
        } catch (error) {
            // console.log("Something went wrong: \n", error)
            logger.error("Internal Server Error", {
                error: error.message,
                from: 'calculateResult()',
                timestamp: new Date()
            })
        }
    }

    function calculatePercent(roomCode) {
        try {
            const data = quizRooms[roomCode]

            for (let i = 0; i < data.currentQuestion.options.length; i++) {
                const val = Math.round(((data.currentQuesStats[i.toString()] as number) / (data.totalSubmission)) * 100)
                data.currentQuesStats[i.toString()] = (data.currentQuesStats[i.toString()]) ? val : 0;
            }
        } catch (error) {
            logger.error("Internal Server Error", {
                error: error.message,
                from: 'calculatePercent()',
                timestamp: new Date()
            })
        }
    }

    io.on("connection", (socket) => {
        console.log("a user connected", socket.id)

        // see if you can make changes that rather attendee count ko baar baar calculate krne k jgh if we can store the value somewhere and increment it by 1 everytime a new attendee joins
        socket.on("attendeeJoinRoom", ({ roomCode, username }) => {
            logger.info("Attendee Joined", {
                username: username,
                roomCode: roomCode,
                timestamp: new Date()
            })

            socket.join(roomCode)
            socket.data.roomCode = roomCode
            socket.data.username = username
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
                    topPoints: [],
                    currentQuesStats: {},
                    totalSubmission: 0      // in case some submissions do not have any option selected, so for that we cant count submissions.length as my valid submissions count
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
            logger.info("Host Joined", {
                roomCode: roomCode,
                timestamp: new Date()
            })

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
                    topPoints: [],
                    currentQuesStats: {},
                    totalSubmission: 0
                }
            }
        })

        socket.on("publishQuestion", ({ roomCode, questionData }) => {
            if (!quizRooms[roomCode]) return

            // subsequent questions — only update these, keep scores intact
            quizRooms[roomCode].currentQuestion = questionData as QuestionData
            quizRooms[roomCode].submissions = [] as Submissions[]
            quizRooms[roomCode].timer = null
            quizRooms[roomCode].isResultCalculated = false
            quizRooms[roomCode].currentQuesStats = {}
            quizRooms[roomCode].totalSubmission = 0

            logger.info("Question Published", {
                roomCode: roomCode,
                questionData: questionData,
                timestamp: new Date()
            })

            io.to(roomCode).emit("newQuestion", questionData)

            quizRooms[roomCode].timer = setTimeout(() => {
                if (!quizRooms[roomCode].isResultCalculated) {
                    calculateResult(roomCode, questionData.correctOption)
                    calculatePercent(roomCode)
                }

                quizRooms[roomCode].scores.forEach(player => {
                    io.to(player.id).emit("displayScoreBoard", {
                        username: player.username,
                        userscore: player.currentPoint,
                        top7: quizRooms[roomCode].top7,
                        topPoints: quizRooms[roomCode].topPoints,
                        optionStats: quizRooms[roomCode].currentQuesStats,
                        correctOption: questionData.correctOption
                    })
                })

                logger.info("Result after Question", {
                    roomCode: roomCode,
                    questionNo: questionData.questionNo,
                    top7: quizRooms[roomCode].top7,
                    topPoints: quizRooms[roomCode].topPoints,
                    timestamp: new Date()
                })

                socket.emit("displayScoreBoard", {
                    top7: quizRooms[roomCode].top7,
                    topPoints: quizRooms[roomCode].topPoints,
                    optionStats: quizRooms[roomCode].currentQuesStats,
                    correctOption: questionData.correctOption
                })
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

            logger.info("Answer Submitted", {
                roomCode: roomCode,
                username: userName,
                questionNo: quizRooms[roomCode].currentQuestion.questionNo,
                correctOption: quizRooms[roomCode].currentQuestion.correctOption,
                submittedOption: optionIndex,
                isAutoSubmit: isAutoSubmit,
                timestamp: new Date()
            })
        })

        socket.on("endQuiz", async ({ roomCode }) => {
            if (socket.data.role !== 'host') return { message: "You are not allowed to end the Quiz as you are not the host", data: [] }

            const quiz = await Quiz.findOneAndUpdate(
                { roomCode: roomCode },
                { $set: { isAttempted: true } },
                { returnDocument: "after" }
            );
            if (!quiz) logger.warn("Quiz not found during endQuiz", { roomCode })

            io.to(roomCode).emit("quizEnded", {
                finalTop7: quizRooms[roomCode].top7,
                finalTopPoints: quizRooms[roomCode].topPoints
            })

            logger.info("Final Result", {
                finalTop7: quizRooms[roomCode].top7,
                finalTopPoints: quizRooms[roomCode].topPoints,
                timestamp: new Date()
            })

            delete quizRooms[roomCode]
        })

        socket.on("disconnect", () => {
            const roomCode = socket.data.roomCode
            if (!roomCode || !quizRooms[roomCode]) return

            const User = (socket.data.role == 'attendee') ? "Attendee" : "Host"
            logger.info(`${User} disconnected`, {
                username: (socket.data.role == 'attendee') ? socket.data.username : "Host",
                timestamp: new Date()
            })

            quizRooms[roomCode].scores = quizRooms[roomCode].scores.filter(p => p.id !== socket.id)
            console.log("a user disconnected", socket.id)
        })
    })
}

const getIO = () => {
    if (!io) throw new Error("Socket not initialized")
    return io
}

export { initSocket, getIO }