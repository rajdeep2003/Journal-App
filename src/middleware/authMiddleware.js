const {signToken, verifyToken} = require("../utils/jwt")

const isprotected = (
    (req,res,next)=>{
        try{
            let token;
            if(req.cookies && req.cookies.token){
                token=req.cookies.token
            }
            else if(req.headers.authorization && req.headers.authorization.startsWith("Bearer ")){
                token = req.headers.authorization.split(" ")[1];
            }
            if(!token){
               return res.status(400).json({
                    message: "no token found, access denied"
                })
            }
            const VerifiedToken = verifyToken(token)
            
            req.user = {userId: VerifiedToken.userId}    // the user._id
            next()
        }
        catch(err){
            return res.status(401).json({
                message: "not authorised",
                err: err.message
            })
        }
    }
)


module.exports = {isprotected}