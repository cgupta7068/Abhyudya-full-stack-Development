
const { ApiError } = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { User } = require("../Models/User.js");
const { Events } = require("../Models/Events.js");
const { generateUser } = require("./username.js");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../authentication/UserAuth.js");

// Register User
const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      password,
      institution,
      course,
      gender,
      referallId,
      profilePicture,
    } = req.body;

    // Fix: profilePicture may be an empty object from the frontend.
    // Accept only a string; otherwise use an empty string.
    const safeProfilePicture =
      typeof profilePicture === "string" ? profilePicture.trim() : "";

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    // Validate required fields (profilePicture is optional)
    const requiredFields = [
      fullName,
      normalizedEmail,
      phoneNumber,
      password,
      institution,
      course,
      gender,
    ];

    if (
      !requiredFields.every(
        (field) => typeof field === "string" && field.trim() !== ""
      )
    ) {
      return res
        .status(400)
        .json(new ApiError(400, "All required fields must be provided"));
    }

    // Check for an existing email or phone number
    const userExist = await User.findOne({
      $or: [
        { email: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
        { phoneNumber: phoneNumber.trim() },
      ],
    });

    if (userExist) {
      return res
        .status(409)
        .json(new ApiError(409, "Email or phone number already exists"));
    }

    // Validate referral ID, if supplied
    if (referallId && referallId.trim() !== "") {
      const referralUser = await User.findOne({
        ABH_ID: referallId.trim(),
      });

      if (!referralUser) {
        return res
          .status(400)
          .json(new ApiError(400, "This Referral ID does not exist"));
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      ABH_ID: await generateUser(fullName.trim(), phoneNumber.trim()),
      fullName: fullName.trim(),
      email: normalizedEmail,
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
      institution: institution.trim(),
      course: course.trim(),
      gender: gender.trim(),
      referallId: referallId ? referallId.trim() : "",
      profilePicture: safeProfilePicture,
    });

    // Do not return the hashed password to the client
    const userResponse = user.toObject();
    delete userResponse.password;

    return res
      .status(201)
      .json(
        new ApiResponse(201, userResponse, "User registered successfully")
      );
  } catch (error) {
    console.error("Register user error:", error.message);

    return res
      .status(500)
      .json(new ApiError(500, "Something went wrong while registering"));
  }
};

// Login User
const Login = async (req, res) => {
  try {
    //console.log("Request came into login function");
    const { email, ABH_ID, password } = req.body;

   // console.log("Login request body:", req.body);

    if ((!email && !ABH_ID) || !password) {
      return res
        .status(400)
        .json(new ApiError(400, "Email/ABH_ID and Password are required"));
    }

    const user = await User.findOne(
      email
        ? {
            email: {
              $regex: `^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              $options: "i",
            },
          }
        : { ABH_ID: ABH_ID.trim() }
    );

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json(new ApiError(400, "Invalid credentials"));
    }

    const token = generateToken(user);

    res.cookie("user", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return res
      .status(200)
      .json(new ApiResponse(200, userResponse, "Login successful"));
  } catch (error) {
    console.error("Login error:", error.message);

    return res
      .status(500)
      .json(new ApiError(500, "Something went wrong!"));
  }
};

// Get All Users
const getUsers = async (req, res) => {
  try {
    const startIndex = Math.max(0, parseInt(req.query.startIndex, 10) || 0);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 9);
    const order = req.query.order;
    const sortDirection = order === "asc" ? 1 : -1;

    const query = {
      ...(req.body.fullName && { fullName: req.body.fullName }),
      ...(req.body.ABH_ID && { ABH_ID: req.body.ABH_ID }),
      ...(req.body.email && { email: req.body.email }),
      ...(req.body.phoneNumber && { phoneNumber: req.body.phoneNumber }),
      ...(req.body.eventsParticipated &&
        req.body.eventsParticipated !== "All" && {
          eventsParticipated: req.body.eventsParticipated,
        }),
      ...(req.body.institution && { institution: req.body.institution }),
    };

    const Users = await User.find(query)
      .select("-password")
      .populate("eventsParticipated")
      .sort({ createdAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    return res.status(200).json({ Users });
  } catch (error) {
    console.error("Get users error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  try {
    const { email, ABH_ID } = req.body;

    if (!email && !ABH_ID) {
      return res
        .status(400)
        .json(new ApiError(400, "Email or ABH_ID is required to delete a user"));
    }

    const conditions = [];
    if (email) conditions.push({ email });
    if (ABH_ID) conditions.push({ ABH_ID });

    const removeUser = await User.findOneAndDelete({ $or: conditions });

    if (!removeUser) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User deleted successfully"));
  } catch (error) {
    console.error("Delete user error:", error.message);
    return res
      .status(500)
      .json(new ApiError(500, "Something went wrong!"));
  }
};

// Update User Details
const updateUser = async (req, res) => {
  try {
    const { email, ABH_ID, ...updateData } = req.body;

    if (!email && !ABH_ID) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Email or ABH_ID is required to update user details"
          )
        );
    }

    delete updateData.ABH_ID;
    delete updateData.phoneNumber;
    delete updateData.email;
    delete updateData.password;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(new ApiError(400, "Update data is required"));
    }

    // Prevent an object from being saved into a string field
    if ("profilePicture" in updateData) {
      updateData.profilePicture =
        typeof updateData.profilePicture === "string"
          ? updateData.profilePicture.trim()
          : "";
    }

    const conditions = [];
    if (email) conditions.push({ email });
    if (ABH_ID) conditions.push({ ABH_ID });

    const user = await User.findOneAndUpdate(
      { $or: conditions },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, user, "User information updated successfully")
      );
  } catch (error) {
    console.error("Update user error:", error.message);
    return res
      .status(500)
      .json(new ApiError(500, "Something went wrong!"));
  }
};

module.exports = {
  registerUser,
  Login,
  getUsers,
  deleteUser,
  updateUser,
};
