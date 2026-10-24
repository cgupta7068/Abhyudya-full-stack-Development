
const mongoose = require("mongoose");
const { Schema } = mongoose;

const courseOptions = [
  "B.Tech",
  "BCA",
  "BBA",
  "MBA",
  "B.Pharm",
  "MCA",
  "Diploma",
  "B.Com",
  "BA",
  "B.Sc",
  "M.Sc",
  "Others",
  "Phd",
];

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    ABH_ID: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    phoneNumber: {
      type: Number,
      required: true,
      unique: true,
    },

    // Fixed: profilePicture is optional
    profilePicture: {
      type: String,
      default: "",
      required: false,
    },

    gender: {
      type: String,
      required: true,
    },

    dob: {
      type: Date,
    },

    password: {
      type: String,
      required: true,
      minLength: 8,
    },

    institution: {
      type: String,
      required: true,
      trim: true,
    },

    course: {
      type: String,
      enum: courseOptions,
      required: true,
    },

    paymentStatus: {
      type: Boolean,
      default: false,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    referallId: {
      type: String,
    },

    isCampusAmbassador: {
      type: Boolean,
      default: false,
    },

    referrals: {
      type: [String],
      validate: {
        validator: function (value) {
          if (value && value.length > 0) {
            return this.isCampusAmbassador;
          }
          return true;
        },
        message: "Only Campus Ambassadors can have referrals",
      },
      default: undefined,
    },

    eventsPending: {
      type: Map,
      of: [{ type: Object }],
      default: () => new Map(),
    },

    eventsPaid: {
      type: Map,
      of: [{ type: Object }],
      default: () => new Map(),
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
