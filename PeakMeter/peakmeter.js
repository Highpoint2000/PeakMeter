(() => {
    ////////////////////////////////////////////////////////////
    ///                                                      ///
    ///  PEAKMETER SCRIPT FOR FM-DX-WEBSERVER (V1.1a)        ///
    ///                                                      ///
    ///  by Highpoint                last update: 10.10.24   ///
    ///                                                      ///
    ///  https://github.com/Highpoint2000/PEAKMETER          ///
    ///                                                      ///
    ////////////////////////////////////////////////////////////

    let volumeSliderValue = 1.0;		// Set the value 0.1-1.0 to reduce the input volume/sensitivity (default: 1.0)
    let volumeSliderEnable = false;		// set to 'true' to activate the manual volume control (default: false)
    let ConsoleDebug = false; 			// set to 'true' to activate console information for debugging
    let minVolumeThreshold = 0.5;  		// Threshold for audio display activation
    let riseRate = 1.93;           		// Rate of increase (the higher, the faster)
    let amplificationFactor = 0.21;  	// Amplification factor
    let bassReductionFactor = -10; 		// Reduction of bass frequencies (in dB)
    let highPassCutoffFrequency = 1000; // Cutoff frequency for high-pass filter (in Hz)

    ////////////////////////////////////////////////////////////

    // Custom console log function
    function debugLog(...messages) {
        if (ConsoleDebug) {
            console.log(...messages);
        }
    }

    const plugin_version = 'V1.1a';
    let audioContext, analyser, dataArray, bassFilter, highPassFilter;
    let peakLevel = 1;  // Track the highest signal level
    let peakLineVisible = false;  // Flag to show the peak line
    let peakLineTimeout;  // Timeout for resetting the peak line
    let audioDataReceived = true;  // Simulate received audio data
    let signalCtx; // 2D context of the canvas
    let AudioSignalCanvas; // Canvas element
    let isConnected;

    document.addEventListener("DOMContentLoaded", function() {
        // Select the first target element
        var targetDiv1 = document.getElementById('pi-code-container'); // Select the first element

        if (targetDiv1) {
            targetDiv1.style.maxHeight = '123px';
        }
        
        var targetDiv2 = document.getElementById('freq-container'); // Select the second element
        if (targetDiv2) {
            targetDiv2.style.maxHeight = '123px';
        }

        // Select the next sibling element after targetDiv2
        var targetDiv3 = targetDiv2.nextElementSibling; // Next sibling element

        if (targetDiv3 && targetDiv3.tagName === 'DIV') { // Ensure targetDiv3 is a Div
            targetDiv3.style.maxHeight = '123px';
        }		

        // Create and add the fourth element (for the peak meter)
        var targetDiv4 = document.createElement('div'); // Create new Div
        targetDiv4.className = 'panel-33'; // Set class
        targetDiv4.id = 'peak-meter-container'; // Set ID   
        targetDiv4.style.width = '33%'; // Set width
		
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .text-big {
                font-size: 45px;
            }
            @media only screen and (max-height: 860px) {
                #peak-meter-container {
                    height: 123px;
                }
            }
            @media only screen and (min-height: 861px) {
                #peak-meter-container {
                    height: 123px;
                }
            }
            @media only screen and (max-width: 824px) and (min-width: 768px) {
                .signal-units.text-medium {
                    display: none !important;
                }
            }
            @media only screen and (min-width: 768px) {
                #pi-code-container,
                #freq-container,
                #freq-container + .panel-33 { /* Signal container */
                    width: 21.333%;
                    padding: 5px;
                }
            }
            @media only screen and (max-width: 768px) {
                #peak-meter-container {
                    margin-top: 30px;
                    height: 8px;
                }
            }
            @media only screen and (min-width: 769px) {
                #audio-meter-canvas {
                    width: 70%;
                    height: 20px; /* Set height for the canvas */
                    margin-top: 40px;
                    margin-left: 5px;
                    position: relative;
                }
                #a-indicator {
                    position: relative;
                    margin-top: -25px;
                    margin-left: -72.0%;
                }
            }
            @media only screen and (max-width: 768px) {
                #audio-meter-canvas {
                    width: 230px;
                    position: absolute;
                    margin-top: 0px; 
                    margin-left: -113px;
                    height: 20px; /* Set height for the canvas */
                }
                #a-indicator {
                    position: absolute;
                    margin-left: -122px;
                    margin-top: 0px;
                    display: inline-block;
                }
            }
        `;
        document.head.appendChild(styleElement);

        // Create the h2 element with the text "PEAKMETER"
        var meterHeader = document.createElement('h2'); // Create h2 element
        meterHeader.style.marginTop = '12px'; // Set margin-top
        meterHeader.textContent = 'PEAKMETER'; // Set text content

        // Add the h2 to the new Div
        targetDiv4.appendChild(meterHeader); // Add h2 to Div

        // Create the canvas element for the peak meter
        var AudiometerCanvas = document.createElement('canvas'); // Create canvas element
        AudiometerCanvas.id = 'audio-meter-canvas'; // Set ID
        AudiometerCanvas.style.imageRendering = "auto";
        AudiometerCanvas.style.display = "inline-block";
        AudiometerCanvas.style.cursor = "pointer";
        AudiometerCanvas.title = `Plugin Version: ${plugin_version}`;

        // Create a new div for the "A" indicator
        var aContainer = document.createElement('div');
        aContainer.id = 'a-indicator'; // Set the ID for the "A" indicator
        aContainer.style.height = '20px'; // Height for the "A" indicator
        aContainer.style.color = '#FFFFFF'; // Color for the "A"
        aContainer.style.fontSize = '8px'; // Font size set to 8px
        aContainer.style.fontFamily = 'Arial, sans-serif'; 
        aContainer.textContent = 'A'; // Set the text for "A"

        // Add the canvas to the new div
        targetDiv4.appendChild(AudiometerCanvas);
        targetDiv4.appendChild(aContainer);

        // Insert targetDiv4 after targetDiv3
        if (targetDiv3) {
            targetDiv3.parentNode.insertBefore(targetDiv4, targetDiv3.nextSibling); // Insert new div after targetDiv3
        }

        // Set the canvas reference and context after adding
        AudioSignalCanvas = document.getElementById('audio-meter-canvas'); 
        signalCtx = AudioSignalCanvas.getContext('2d'); 

        // Set the actual internal size of the canvas (for clear drawing)
        AudioSignalCanvas.width = AudioSignalCanvas.offsetWidth;  // Width matches the CSS width
        AudioSignalCanvas.height = 20;  // Set height for internal rendering
		// AudioSignalCanvas.style.marginTop = "-140px";  // Set height for internal rendering

        // Check if the stream object is available
        checkStreamAndInit(); // Call function to start initialization
		
        // Draw scale marks
        drawScaleMarks();
		
		// Find the volume slider, set it to maximum and make it transparent
		const volumeSlider = document.getElementById('volumeSlider');
		if (volumeSlider) {
			volumeSlider.value = volumeSliderValue; // Set to value
		}

		if (!volumeSliderEnable) {
			if (volumeSlider) {
				volumeSlider.disabled = true; // Disable the slider to prevent interaction
				volumeSlider.style.opacity = '0.25'; // Set opacity to 0.25 for transparency
				volumeSlider.style.cursor = "default";
			}
		}
    });

    setInterval(function() {
      if (!Stream) {
        checkStreamAndInit(); // Call the function
      }
    }, 1000); // Interval of 1000 ms (1 second)

    function checkStreamAndInit() {
        // Check if Stream object and its Fallback property exist
        if (typeof Stream !== 'undefined' && Stream && Stream.Fallback && Stream.Fallback.Player) {
            debugLog('Stream object and Fallback.Player are available.');
            initAudioMeter();  // Initialize the audio meter only if Stream and its properties exist
        } else {
            setTimeout(checkStreamAndInit, 500);  // Retry after 500ms if not available
        }
    }

    // Function to initialize the audio meter
    function initAudioMeter() {
        debugLog("Initializing audio meter...");
        audioContext = Stream.Fallback.Audio;  // Use the same audio context as in the fallback
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Set the FFT size
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        // Set up the bass reduction filter (Low-Shelf Filter)
        bassFilter = audioContext.createBiquadFilter();
        bassFilter.type = 'lowshelf'; // Apply a low-shelf filter to affect bass
        bassFilter.frequency.setValueAtTime(200, audioContext.currentTime); // Target frequencies below 200Hz
        bassFilter.gain.setValueAtTime(bassReductionFactor, audioContext.currentTime); // Reduce the gain based on bassReductionFactor

        // Set up the high-pass filter
        highPassFilter = audioContext.createBiquadFilter();
        highPassFilter.type = 'highpass'; // Apply a high-pass filter
        highPassFilter.frequency.setValueAtTime(highPassCutoffFrequency, audioContext.currentTime); // Target frequencies above highPassCutoffFrequency

        connectTo3LASPlayer(); // Connect to the 3LAS player (stream)
    }

    // Function to connect to the 3LAS audio player (stream)
    function connectTo3LASPlayer() {
        if (Stream && Stream.Fallback && Stream.Fallback.Player) {
            const liveAudioPlayer = Stream.Fallback.Player;  // Access the LiveAudioPlayer

            if (liveAudioPlayer.Amplification) {
                // Connect the audio chain
                liveAudioPlayer.Amplification.connect(bassFilter); // Connect the player's amplification to the bass filter
                bassFilter.connect(highPassFilter);  // Connect the bass filter to the high-pass filter
                highPassFilter.connect(analyser);  // Connect the high-pass filter to the analyser
                
                startSignalMeter();
                debugLog("Successfully connected to the LiveAudioPlayer.");
            } else {
                console.error("Amplification node not ready. Retrying...");
                setTimeout(connectTo3LASPlayer, 500); // Retry after 500ms if amplification is not ready
            }
        } else {
            console.error("Stream, Fallback, or LiveAudioPlayer not initialized. Retrying...");
            setTimeout(connectTo3LASPlayer, 500); // Retry after 500ms if stream or fallback not initialized
        }
    }

    // Function to start the audio signal meter
    function startSignalMeter() {
        setInterval(updateSignalMeter, 75);  // Update every 75ms
    }

    // Function to update the signal meter
    function updateSignalMeter() {
        if (!audioDataReceived) return;

        // Get frequency data from the analyser
        analyser.getByteFrequencyData(dataArray);

        // Calculate signal strength based on frequency data
        let signalLevel = dataArray.reduce((a, b) => a + b) / dataArray.length;

        // Apply threshold: display only if signalLevel is greater than the threshold
        if (signalLevel < minVolumeThreshold) {
            signalLevel = 0;
        }

        // Apply amplification
        signalLevel *= amplificationFactor;

        // Apply rise rate
        signalLevel = Math.pow(signalLevel, riseRate);

        // Cap the signal level at 255 (the maximum value for the signal meter)
        signalLevel = Math.min(signalLevel, 255);

        // Track the peak value
        if (signalLevel > peakLevel) {
            peakLevel = signalLevel;
            peakLineVisible = true;

            // Clear existing timeout for the peak line
            if (peakLineTimeout) {
                clearTimeout(peakLineTimeout);
            }

            // Set timeout to clear the peak line after 1 second
            peakLineTimeout = setTimeout(() => {
                peakLevel = 0;  // Reset peak value
                peakLineVisible = false;  // Hide peak line
            }, 1000);
        }

        // Calculate the width for the green bar (up to 70%)
        const seventyPercentWidth = 0.7 * AudioSignalCanvas.width;
        const signalWidth = (signalLevel / 255) * AudioSignalCanvas.width;

        // Clear the canvas
        signalCtx.clearRect(0, 0, AudioSignalCanvas.width, AudioSignalCanvas.height);
		
        drawScaleMarks();

        // Draw the green part of the bar (up to 70%)
        signalCtx.fillStyle = '#08B818';  // Green for values up to 70%
        signalCtx.fillRect(0, 0, Math.min(seventyPercentWidth, signalWidth), AudioSignalCanvas.height - 16); // Height for drawing bar

        // If the signal exceeds 70%, draw the red part
        if (signalWidth > seventyPercentWidth) {
            signalCtx.fillStyle = '#FF0000';  // Red for the part exceeding 70%
            signalCtx.fillRect(seventyPercentWidth, 0, signalWidth - seventyPercentWidth, AudioSignalCanvas.height - 16);
        }

        // Draw the peak line if it is visible
        if (peakLineVisible) {
            const peakX = (peakLevel / 255) * AudioSignalCanvas.width;  // Calculate X position for the peak line
            signalCtx.strokeStyle = '#FFFF00';  // Yellow for the peak line
            signalCtx.lineWidth = 2;
            signalCtx.beginPath();
            signalCtx.moveTo(peakX, 0); // Start at the top of the meter
            signalCtx.lineTo(peakX, AudioSignalCanvas.height - 16); // Draw down to the bottom of the meter
            signalCtx.stroke();
        }
    }

    // Function to draw scale marks
    function drawScaleMarks() {
        // Draw the background bar
        signalCtx.fillStyle = '#212223';
        signalCtx.fillRect(0, 0, AudioSignalCanvas.width, 5); // Adjust height to make it slimmer

        // Define positions for scale values
        const scaleValues = [10, 30, 50, 70, 100];
        const scalePositions = scaleValues.map(val => (val / 100) * AudioSignalCanvas.width);

        // Set text and line styles
        signalCtx.font = '9px Arial, sans-serif'; // Set font size and family together
        signalCtx.fillStyle = '#FFFFFF';
        signalCtx.textAlign = 'center';

        // Draw tick marks and labels
        scalePositions.forEach((pos, index) => {
            // Draw tick mark
            signalCtx.beginPath();
            // If it's the last mark (100), shift it left by 10 pixels
            const adjustedPos = (index === 4) ? pos - 10 : pos; // Only shift 100 left by 10px
            signalCtx.moveTo(adjustedPos, 4);  // Position of tick mark at the bottom of the bar
            signalCtx.lineTo(adjustedPos, 6);  // Draw a small tick mark below the bar
            signalCtx.strokeStyle = '#FFFFFF';
            signalCtx.lineWidth = 2;
            signalCtx.stroke();

            // Draw label (10, 30, 50, 70, 100) and shift "100" left by 10px
            signalCtx.fillText(scaleValues[index], adjustedPos, 16);  // Adjust position to be below the tick mark
        });
    }
})();
