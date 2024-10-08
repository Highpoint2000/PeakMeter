# Peakmeter for [FM-DX-Webserver](https://github.com/NoobishSVK/fm-dx-webserver)

The plugin displays the current audio level. The box provided also integrates the SignalMeterSmall Plugin.

![image](https://github.com/user-attachments/assets/5872fd92-d3f8-4214-bb6c-c096c4ad2a0a)


## v1.0a

- Activation of the volume control slider built into the header of the script

## Installation notes:

1. 	Download the last repository as a zip
2.	Unpack the PeakMeterPlugin.js and the PeakMeter folder with the peakmeter.js into the web server plugins folder (..fm-dx-webserver-main\plugins)
3. 	Restart the server
4. 	Activate the plugin it in the settings
5.	Calibrate the volume with volume rotary control (only Receiver with display)

## Important notes: 

- You can download an adapted version of the SignalMeterSmall for correct display in the peak meter box here: https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-S-Meter
- If you use the volume slider to recalibrate the volume, you should save the determined reference volume in the web server settings under Tuner as the starting volume. This will restore this setting for all users when the website is accessed.
  
## History:

### v1.0

- Make the boxes for PI code, frequency and signal smaller
- Show audiopeakmeter in a new box with space to display the SignalMeterSmall (see important notes!)
- set volume to 100% an disable volume slider 
