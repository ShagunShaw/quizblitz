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
}, {timestamps: true})

export const User= mongoose.model("User", userSchema)