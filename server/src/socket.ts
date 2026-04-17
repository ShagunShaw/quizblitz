import { Server } from "socket.io"

let io;

const initSocket = (server) => {
    io = new Server(server)

    io.on("connection", (socket) => {
        console.log("a user connected", socket.id)

        socket.on("attendeeJoinRoom", (roomCode) => {
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

        socket.on("hostJoinRoom", (roomCode) => {
            socket.join(roomCode)
            socket.data.role = 'host'
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