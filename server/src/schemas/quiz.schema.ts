import mongoose from 'mongoose'

const quizSchema = new mongoose.Schema({
    Hosts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true         // This will help us to quickly locate our user to which this quiz belong for a given user
        }
    ],
    roomCode: {
        type: String,
        lowercase: true,
        minlength: 6,
        maxlength: 6,
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
    TotalPoints: {
        type: Number,
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
        kgjhfjhfhf
    }
}, { timestamps: true })

interface IQuestion {
    point: number
}

quizSchema.pre('save', async function (next: mongoose.CallbackWithoutResultAndOptionalError) {
    if (this.isModified('Questions')) {
        this.QuestionsCount = this.Questions.length;

        const questions = await mongoose.model('Question').find({
            _id: { $in: this.Questions }
        }).lean<IQuestion[]>()

        let points = 0;
        for (let i = 0; i < questions.length; i++) {
            points += questions[i].point
        }
        this.TotalPoints = points
    }
    next()
})

export const Quiz = mongoose.model("Quiz", quizSchema)