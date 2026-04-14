// backend/src/models/Setting.js
import mongoose from "mongoose";

const SettingSchema = new mongoose.Schema({
  platformName: { type: String, default: "My Platform" },
  // Add more system-wide settings here
});

const Setting = mongoose.model("Setting", SettingSchema);

export default Setting;