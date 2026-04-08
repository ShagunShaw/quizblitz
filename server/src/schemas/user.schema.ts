import mongoose from "mongoose";

const userSchema= new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    refreshTokens: [
        {
            sessionId: Number,
            token: String
        }
    ],
    quizes: [
        {
            quizId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Quiz"
            }, 
            isAttempted: {
                enum: [true, false],
                default: false
            }
        }
    ]
}, {timestamps: true})

export const User= mongoose.model("User", userSchema)