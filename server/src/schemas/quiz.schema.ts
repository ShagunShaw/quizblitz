import mongoose from 'mongoose'

const quizSchema = new mongoose.Schema({
    Hosts: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                index: true         // this will help to quickly locate to this field 
            },
            role: {
                type: String,
                enum: ['owner', 'cohost']
            }
        }
    ],
    roomCode: {
        type: String,
        lowercase: true,
        minlength: 8,
        maxlength: 8,
        required: true,
        unique: true
    },
    Questions: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question"
        }
    ],
    Title: {
        type: String,
        required: true
    },
    Description: {
        type: String,
        maxlength: 150
    },
    QuestionsCount: {
        type: Number,
    },
    isAttempted: {
        type: Boolean,
        default: false
    },
    isPermanent: {
        type: Boolean,
        default: false
    },
    startTime: {
        type: Date,
        required: true
    }
}, { timestamps: true })

quizSchema.pre('save', async function () {
    if (this.isModified('Questions')) {
        this.QuestionsCount = this.Questions.length;
    }
})

export const Quiz = mongoose.model("Quiz", quizSchema)