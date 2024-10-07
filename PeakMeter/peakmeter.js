(() => {
	
////////////////////////////////////////////////////////////
///                                                      ///
///  PEAKMETER SCRIPT FOR FM-DX-WEBSERVER (V1.0 BETA)   ///
///                                                      ///
///  by Highpoint                last update: 07.10.24   ///
///                                                      ///
///  https://github.com/Highpoint2000/PEAKMETER         ///
///                                                      ///
////////////////////////////////////////////////////////////

let ConsoleDebug = true; // Define ConsoleDebug variable

////////////////////////////////////////////////////////////

// Custom console log function
function debugLog(...messages) {
    if (ConsoleDebug) {
        console.log(...messages);
    }
}

    // Variables and constants
	const plugin_version = 'V1.0 BETA';
    let audioContext, analyser, dataArray;
    let signalAmplification = 2;  // Amplification factor for the signal
    let signalThreshold = 5;  // Threshold for very low values
    let peakLevel = 1;  // Track the highest signal level
    let peakLineVisible = false;  // Flag to show the peak line
    let peakLineTimeout;  // Timeout for resetting the peak line
    let audioDataReceived = true;  // Simulate received audio data
    let signalCtx; // 2D context of the canvas
    let signalCanvas; // Canvas element
    let isConnected;

    document.addEventListener("DOMContentLoaded", function() {
        // Select the first target element
        var targetDiv1 = document.getElementById('pi-code-container'); // Select the first element

        if (targetDiv1) {
            targetDiv1.style.width = '21%'; // Set width for targetDiv1
        }
        
        var targetDiv2 = document.getElementById('freq-container'); // Select the second element
        if (window.innerWidth >= 768) {
            if (targetDiv2) {
                targetDiv2.style.width = '21%'; // Set width for targetDiv2
            }
        }

        // Select the next sibling element after targetDiv2
        var targetDiv3 = targetDiv2.nextElementSibling; // Next sibling element

        if (targetDiv3 && targetDiv3.tagName === 'DIV') { // Ensure targetDiv3 is a Div
            targetDiv3.style.width = '21%'; // Set width for targetDiv3
        }		

        // Create and add the fourth element (for the peak meter)
        var targetDiv4 = document.createElement('div'); // Create new Div
        targetDiv4.className = 'panel-33'; // Set class
        targetDiv4.id = 'peak-meter-container'; // Set ID   
        targetDiv4.style.width = '33%'; // Set width
		
        if (window.innerHeight >= 860) {
            targetDiv4.style.height = '125px'; // Set height
        } else {
            targetDiv4.style.height = '110px'; // Set height
        }

        // Create the h2 element with the text "PEAKMETER"
        var meterHeader = document.createElement('h2'); // Create h2 element
        meterHeader.style.marginTop = '6px'; // Set margin-top
        meterHeader.textContent = 'PEAKMETER'; // Set text content

        // Add the h2 to the new Div
        targetDiv4.appendChild(meterHeader); // Add h2 to Div

        // Create the canvas element for the peak meter
        var AudiometerCanvas = document.createElement('canvas'); // Create canvas element
        AudiometerCanvas.id = 'audio-meter-canvas'; // Set ID
	
        if (window.innerWidth >= 768) {
            AudiometerCanvas.style.width = '74%';
            AudiometerCanvas.style.height = "130px";
            AudiometerCanvas.style.marginTop = '-17px'; 
            AudiometerCanvas.style.position = 'relative'; // Set position to relative
        } else {
            AudiometerCanvas.style.width = '256px';  // Make sure 'width' is all lowercase
            AudiometerCanvas.style.position = 'absolute'; // Set position to absolute
            AudiometerCanvas.style.marginTop = '-7px'; 
            AudiometerCanvas.style.marginLeft = '-135px'; // Left margin for positioning
            AudiometerCanvas.style.height = "130px";
        }

        AudiometerCanvas.style.imageRendering = "auto";
        AudiometerCanvas.style.display = "inline-block";
        AudiometerCanvas.style.cursor = "pointer";
		AudiometerCanvas.title = `Plugin Version: ${plugin_version}`;
		
        // Create a new div for the "A" indicator
        var aContainer = document.createElement('div');

        if (window.innerWidth >= 768) {
            aContainer.style.position = 'relative'; // Set position to relative
            aContainer.style.marginTop = '45px'; 
            aContainer.style.marginLeft = '-77%'; // Left margin for positioning
        } else {	
            aContainer.style.position = 'absolute'; 
            aContainer.style.marginLeft = '-145px'; // Left margin for positioning
            aContainer.style.marginTop = '-10px'; // Top margin for positioning
            aContainer.style.display = "inline-block";
        }	
		
        aContainer.style.height = '20px'; // Height for the "A" indicator
        aContainer.style.color = '#FFFFFF'; // Color for the "A"
        aContainer.style.fontSize = '9px'; // Font size set to 9px
        aContainer.textContent = 'A'; // Set the text for "A"

        // Add the canvas to the new div
        targetDiv4.appendChild(aContainer);
        targetDiv4.appendChild(AudiometerCanvas);

        // Insert targetDiv4 after targetDiv3
        if (targetDiv3) {
            targetDiv3.parentNode.insertBefore(targetDiv4, targetDiv3.nextSibling); // Insert new div after targetDiv3
        }

        // Set the canvas reference and context after adding
        signalCanvas = document.getElementById('audio-meter-canvas'); 
        signalCtx = signalCanvas.getContext('2d'); 

        // Check if the stream object is available
        checkStreamAndInit(); // Call function to start initialization
		
        // Draw scale marks
        drawScaleMarks();
    });

    setInterval(function() {
		if (!Stream) {
			checkStreamAndInit(); // Call the function
		}
    }, 1000); // Interval of 1000 ms (1 seconds)

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

        connectTo3LASPlayer(); // Connect to the 3LAS player (stream)
    }

    // Function to connect to the 3LAS audio player (stream)
    function connectTo3LASPlayer() {
        if (Stream && Stream.Fallback && Stream.Fallback.Player) {
            const liveAudioPlayer = Stream.Fallback.Player;  // Access the LiveAudioPlayer

            if (liveAudioPlayer.Amplification) {
                liveAudioPlayer.Amplification.connect(analyser); // Connect to the analyser
                // analyser.connect(audioContext.destination);  // Connect analyser to destination
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
        setInterval(updateSignalMeter, 100);  // Update every 100ms
    }

    // Function to update the signal meter
    function updateSignalMeter() {
        if (!audioDataReceived) return;

        // Get frequency data from the analyser
        analyser.getByteFrequencyData(dataArray);

        // Calculate signal strength based on frequency data
        let signalLevel = dataArray.reduce((a, b) => a + b) / dataArray.length;

        // Apply amplification to the signal
        signalLevel *= signalAmplification;

        // Apply threshold: if signalLevel is below the threshold, set it to zero
        if (signalLevel < signalThreshold) {
            signalLevel = 0;
        }

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
        const seventyPercentWidth = 0.7 * signalCanvas.width;
        const signalWidth = (signalLevel / 255) * signalCanvas.width;

        // Clear the canvas
        signalCtx.clearRect(0, 0, signalCanvas.width, signalCanvas.height);
		
        drawScaleMarks();

        // Draw the green part of the bar (up to 70%)
        signalCtx.fillStyle = '#08B818';  // Green for values up to 70%
        signalCtx.fillRect(0, 0, Math.min(seventyPercentWidth, signalWidth), 5); 

        // If the signal exceeds 70%, draw the red part
        if (signalWidth > seventyPercentWidth) {
            signalCtx.fillStyle = '#FF0000';  // Red for the part exceeding 70%
            signalCtx.fillRect(seventyPercentWidth, 0, signalWidth - seventyPercentWidth, 5);
        }

        // Set transparency for the yellow line
        signalCtx.globalAlpha = 0.75; // Set transparency (0.0 = fully transparent, 1.0 = fully opaque)
        
        // Draw a yellow vertical line at the top of the audiometer
        signalCtx.fillStyle = '#FFFF00'; // Yellow for the line
        signalCtx.fillRect(0, 0, 2.5, 15); // Draw the line (x=0, y=0, width=2.5, height=15)

        // Reset transparency to 1.0 for subsequent drawings
        signalCtx.globalAlpha = 1.0;

        // Draw the peak line if it is visible
        if (peakLineVisible) {
            const peakX = (peakLevel / 255) * signalCanvas.width;  // Calculate X position for the peak line
            signalCtx.strokeStyle = '#FFFF00';  // Yellow for the peak line
            signalCtx.lineWidth = 2;
            signalCtx.beginPath();
            signalCtx.moveTo(peakX, 0); // Start at the top of the meter
            signalCtx.lineTo(peakX, 4); // Draw down to the bottom of the meter
            signalCtx.stroke();
        }
    }

    // Function to draw scale marks
    function drawScaleMarks() {
        // Draw the background bar
        signalCtx.fillStyle = '#212223';
        signalCtx.fillRect(0, 0, signalCanvas.width, 5); // Adjust height to make it slimmer

        // Define positions for scale values
        const scaleValues = [10, 30, 50, 70, 100];
        const scalePositions = scaleValues.map(val => (val / 100) * signalCanvas.width);

        // Set text and line styles
        signalCtx.font = '9px';
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
