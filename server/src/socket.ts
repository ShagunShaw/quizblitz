import { Server } from "socket.io"

let io;
const quizRooms = {}

const initSocket = (server) => {
    io = new Server(server)

    function calculateResult(roomCode) {
        // has access to io and quizRooms since same file scope
    }

    io.on("connection", (socket) => {
        console.log("a user connected", socket.id)

        socket.on("attendeeJoinRoom", ({ roomCode }) => {
            socket.join(roomCode)
            socket.data.role = 'attendee'       // socket.data is a built-in Socket.io object — it's basically an empty object attached to every socket connection where you can store anything you want about that specific socket.

            const room = io.of("/").adapter.rooms.get(roomCode)
            let attendeeCount = 0

            room?.forEach(socketId => {
                const s = io.sockets.sockets.get(socketId)
                if (s?.data.role === 'attendee') attendeeCount++
            })

            io.to(roomCode).emit("AttendeeCount", { attendeeCount })
        })

        socket.on("hostJoinRoom", ({ roomCode }) => {
            socket.join(roomCode)
            socket.data.role = 'host'
        })

        socket.on("publishQuestion", ({ roomCode, questionData }) => {

            if (!quizRooms[roomCode]) {
                quizRooms[roomCode] = {         // Initialising if not present
                    currentQuestion: questionData,
                    submissions: [],
                    timer: null,
                    scores: {},
                }
            } else {
                // subsequent questions — only update these, keep scores intact
                quizRooms[roomCode].currentQuestion = questionData
                quizRooms[roomCode].submissions = []
                quizRooms[roomCode].timer = null
            }

            io.to(roomCode).emit("newQuestion", questionData)

            quizRooms[roomCode].timer = setTimeout(() => {
                calculateResult(roomCode)
                
            }, (questionData.time + 2) * 1000)
        })

        socket.on("submitAnswer", ({ roomCode, optionIndex }) => {       // to be called from frontend when someone clicks submit, or when auto-submit after the timer expires
            if (!quizRooms[roomCode]) return

            const arr = quizRooms[roomCode].submissions
            if (arr.some(d => d.id === socket.id)) return

            const data = {
                id: socket.id,
                submittedOption: optionIndex
            }
            quizRooms[roomCode].submissions.push(data)
        })

        socket.on("disconnect", () => {
            console.log("user disconnected", socket.id)
        })
    })
}

const getIO = () => {
    if (!io) throw new Error("Socket not initialized")
    return io
}

export { initSocket, getIO }