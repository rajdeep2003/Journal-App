const jwt = require("jsonwebtoken")

const signToken = (
    (user)=>{
        return jwt.sign(
            {userId: user._id}, //payload is expected to be json
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRES_IN}
        )
    }
)

const verifyToken = (
    
    (token)=>{
        return jwt.verify(token, process.env.JWT_SECRET)   //returns id, iat, expiry
    }
)

module.exports = {signToken, verifyToken}