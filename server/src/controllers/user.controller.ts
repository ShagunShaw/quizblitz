import { User } from "../schemas/user.schema.ts";

export const logOutUser= async (req, res) => {
    try {
        const payload= req.user;

        const user= await User.findById(payload.userId)
        user.refreshTokens.pull({ sessionId: payload.sessionId })
        await user.save()

        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')
        res.status(200).send("User logged out successfully").redirect("http://localhost:5500/client/logout.html")
    } catch (error) {
        res.status(500).json({errorCode: error.code, errorMessage: error.message})
    }
}