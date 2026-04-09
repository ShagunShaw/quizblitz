import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
    point: {
        type: Number,
        required: true
    },
    time: {         // In seconds only
        type: Number,
        default: 30
    },
    question: {
        type: String,
        required: true
    },
    options: {
        type: [String],
        validate: {
            validator: function (arr: string[]) {
                return arr.length >= 2 && arr.length <= 5
            },
            message: 'Options must have between 2 and 5 items'
        }
    },
    correctOption: {
        required: true,
        type: Number,
        validate: {
        validator: function(val: number) {
            return val > 0 && val <= this.options.length
        },
        message: 'correctOption must be a valid option index'
    }
    }
})

export const Question = mongoose.model("Question", questionSchema) 