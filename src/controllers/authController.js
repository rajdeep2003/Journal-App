const User = require("../models/User");
const { hashPassword, comparePassword } = require("../utils/hash");
const { signToken, verifyToken } = require("../utils/jwt");

const signup = async (req, res, next) => {
  try {
    let {username,passwordHash} = req.body;
    if (!username || !passwordHash) {
      return res.status(400).json({
        message: "all fields are not present",
        errorCode: 400,
      });
    }
    
       // Normalize username
        username = username.trim();

        // Username length validation
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        message: "Username must be between 3 and 20 characters",
        errorCode: 400,
      });
    }

     // Username character validation
    // Allows: letters, numbers and underscore
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        message: "Username can only contain letters, numbers, and underscores",
        errorCode: 400,
      });
    }

    if (passwordHash.length < 6) {
      return res.status(400).json({
        message: "password muxt not be less than 6 charecters",
        errorCode: 400,
      });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        message: "userName already exist",
        errorCode: 400,
      });
    }
    const hashedPassword = await hashPassword(passwordHash);

    const user = await User.create({
      username,
      passwordHash: hashedPassword,
    });

    const token = signToken(user);

    res.cookie("token", token, {          //this will be used in web automatically
      httpOnly: true,
      sameSite: "lax",
      secure: false, // true only in HTTPS
    });



    res.status(200).json({
      message: "signup successful",
      token,          // this will be used in app and to be stored in EncryptedSharedPreferences/ Android Keystore/ other libraries(best)
      user: {
        userId: user._id,
        username: user.username,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "failed to signup",
      err: err.message,
    });
  }
};

const login = async (req, res, next) => {
  try {
    const {username,passwordHash} = req.body;
    if (!username || !passwordHash) {
      return res.status(400).json({
        message: "all fields not present",
        statusCode: 400,
      });
    }
    const user = await User.findOne({ username }).select("+passwordHash");

    //if user exist
    if (!user) {
      return res.status(400).json({
        message: "user not registered",
        statusCode: 400,
      });
    }

    const isPasswordCorrect = await comparePassword(passwordHash, user.passwordHash);

    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: "incorrect password",
        statusCode: 400,
      });
    }

    const token = signToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // true only in HTTPS
    });

    res.status(200).json({
      message: "logged in successfully",
      token,
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "failed to login",
      error: err.message,
    });
  }
};

const logout = async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(0),
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};
// for android logout--> dont call this, do in clint: secureStorage.delete("jwt")/ or where ever u r storing the token

module.exports = { signup, login, logout };