import { Config } from "@remotion/cli/config";

// Formato de salida: mp4 (H.264), el que aceptan Instagram, TikTok y WhatsApp.
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
