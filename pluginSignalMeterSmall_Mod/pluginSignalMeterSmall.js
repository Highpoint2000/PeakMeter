/*
    Signal Meter Small v1.2.2 by AAD
    https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-S-Meter
    https://github.com/NO2CW/FM-DX-Webserver-analog-signal-meter
*/

//////////////////////////////////////////////////

const isOutsideField = true;
const enableSquelch = true;
const enableLowSignalInterpolation = true;

//////////////////////////////////////////////////

// Set initial stream volume and other variables
streamVolume = 1;
var valueSquelchVolume = 1;
var activeSquelch = false;
var isEnabledSquelch = enableSquelch;
const minMeterPosition = 8;
// Global variables for other plugins
pluginSignalMeterSmall = true;
pluginSignalMeterSmallSquelchActive = false;

// updateVolume also exists in /js/3las/main.js
function updateVolume() {
	streamVolume = $(this).val();
	setTimeout(() => Stream.Volume = $(this).val(), 100);
}

(function() {
    function initSignalMeterSmall() {
        document.addEventListener('DOMContentLoaded', function() {
            debugMode = false; // For debugging purposes only

			const panels = Array.from(document.querySelectorAll('.panel-33'));
            container = panels.find(panel => panel.textContent.includes('PEAKMETER'));

            const signalMeter = document.createElement('canvas');
            signalMeter.id = 'signal-meter-small-canvas';
            signalMeter.style.width = '256px';
            signalMeter.style.height = '13px';
			signalMeter.style.top = '50px';
            // Setting of pixelated was required if height was an odd number
            signalMeter.style.imageRendering = 'auto';
            // Configure squelch marker
            const markerCanvas = document.createElement('canvas');
            markerCanvas.id = 'signal-meter-small-marker-canvas';
            markerCanvas.style.width = '256px';
            markerCanvas.style.height = '13px';
            markerCanvas.style.imageRendering = 'auto';
            markerCanvas.style.top = '50px';
            markerCanvas.style.left = signalMeter.style.left;
            // Inside or outside SIGNAL field
            if (isOutsideField) {
                offset = -257;
                signalMeter.style.margin = '4px 0 0 ' + offset + 'px';
                signalMeter.style.position = 'absolute';
                markerCanvas.style.margin = '4px 0 0 ' + offset + 'px';
                markerCanvas.style.position = 'absolute';
            } else {
                offset = 0;
                signalMeter.style.margin = '4px 0 0 ' + offset + 'px';
                signalMeter.style.position = 'relative';
                markerCanvas.style.margin = '4px 0 0 -256px';
                markerCanvas.style.position = 'relative';
            }
            container.appendChild(signalMeter);
            container.appendChild(markerCanvas);

            markerPosition = minMeterPosition + 1; // Initial marker position
            markerPositionMin = '';
            markerPositionMax = '';
            showMarker = true;

            // Override breadcrumbs.css to make this canvas visible on mobile devices
            document.getElementById('signal-meter-small-canvas').style.display = 'inline-block';
            document.getElementById('signal-meter-small-marker-canvas').style.display = 'inline-block';

            // Add tooltip
            let firstTooltip = `Double-click 'S' to toggle show/hide S-Meter.${isEnabledSquelch ? '<br><strong>Squelch does not affect other listeners.</strong>' : ''}`;
            markerCanvas.classList.add('tooltip-meter');
            markerCanvas.setAttribute('data-tooltip', firstTooltip);
            markerCanvas.style.cursor = 'pointer';
            initMeterTooltips();

            const ctx = signalMeter.getContext('2d');
            signalMeter.width = 256;
            signalMeter.height = 13;
            // Squelch
            const markerCtx = markerCanvas.getContext('2d');
            markerCanvas.width = 256;
            markerCanvas.height = 13;

            const backgroundImage = new Image();
            backgroundImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAAMCAMAAAC6GZObAAAAB3RJTUUH6AYBCTY2SEie6QAAAAlwSFlzAAAK8AAACvABQqw0mAAAAOpQTFRFAP8Af/9/v/+//wAA/39//6+v/7+/////////////////////////////////////////////////////////////AP8Af/9//wAA/39/////////////////////////////////////////////////////////////////////////////f/9/////////////////////////////////////////////////////////////////////////////AP8A/zAw////////////////////////////////////////////h5eLSwAAAE50Uk5TAAAAAAAAAAAECAwQFBgcHyAjJygrLzAwMDAzNzs/Q0dLT1NXW19jZ2tvc3d7f3+Dh4uPk5ebn6Onq6+zt7u/w8fIyMvP09fb3+Pn6+/z2M/URgAAAkRJREFUSMfllVt3mkAUhUlNuwcBJabkBlTUJoRgNJJmEITxglFim///d/pQoyNOXE2Wecp5OvPNXmdm7TkHpPZ8xGR83pDyY7iVz2xAdxE6+MwGQGv9tsV7p6cHq/iY/MvWmefnh1uxf/aNMyCzjx9/rNe3t+t8PJYkaZXzfA+5JEnj8cGWAZNJkXzdLyuVSpPJIWeAHafXr3THyYm0io/Jtw04Oyttxf4Zb8Dr0yF3GkJuxpEh4j1KLQFWKaW+SN9IqFZATg9mQlWOkC7zofUH/Inl+9QtMuB6S6dSStVaHFU367U3dDsMiMKOkCeVCybiI10vCzDRdU9UqDJV6n0eMFwGOZlVWg8cagZkYEVO9fEF2R14V3Km84zqgBkyFJgd6DoZGWa6RDoF3B65M3ndDgPKl2IDYLTbopdmD0FZqCeZImwkaM9cUXtqf0duxCBzDlWBYS0Hhstfte1RW9GcVF4zzU5aJklVhgJr0vBGmQL58sBWYmsDL/I53U4D8JoB9eBOZMCdfHX/ljrxIHxar3y6oA3kVri68BIFHnKA6cuHTaa0duRH2ppZdB713CswFJjlEuoNV/V60ZxarEvCFlfvHQYQF1iIWroJI/r/BkDZIZXh5ggAuTJDjfEo8ICsQubyegSaGno/eUZ19Bn74xeYdQHvOpeVGTcC9034N7zuHR3wK2GiDTntT823NFIcZxsfTQNAjm7KUQPOM2N1J2PeC1KqqGf9ocKzmvzPrQI7moYj1R2Omi83rAHVLBypvO4vLbqZlIEXd4UAAAAASUVORK5CYII=';
            backgroundImage.onload = function() {
                ctx.drawImage(backgroundImage, 0, 0, signalMeter.width, signalMeter.height - 1);
            };

            // Draw squelch marker
            function drawMarker() {
                if (isEnabledSquelch && markerPositionMin && showMarker) {
                    markerCtx.clearRect(0, 0, markerCanvas.width, markerCanvas.height);
                    markerCtx.beginPath();
                    markerCtx.moveTo(markerPosition, 0);
                    markerCtx.lineTo(markerPosition, markerCanvas.height);
                    markerCtx.strokeStyle = '#FEEE33'; // Marker color
                    markerCtx.lineWidth = 2;
                    markerCtx.globalAlpha = 0.8;
                    markerCtx.stroke();
                }
            }

            if (isEnabledSquelch) {
                let isDragging = false;
                let offsetX = 0;

                // Event listener to start dragging
                markerCanvas.addEventListener('mousedown', startDragging);
                markerCanvas.addEventListener('touchstart', startDragging);

                function startDragging(event) {
                    event.preventDefault(); // Prevent default touch behavior

                    const savedOpacity = localStorage.getItem('signalMeterSmallVisibility') ? localStorage.getItem('signalMeterSmallVisibility') : 1;
                    // Return if signal meter is hidden
                    showMarker = true;
                    if (savedOpacity != 1) { showMarker = false; markerPosition = minMeterPosition + 1; return; }
                    // Disable middle click from setting marker
                    if (event.button === 1 || (event.touches && event.touches.length > 1)) {
                        event.preventDefault(); // Prevent default middle click behaviour or multi-touch
                    } else {
                        const rect = markerCanvas.getBoundingClientRect();
                        let mouseX, touchX;

                        if (event.type === 'mousedown') {
                            mouseX = event.clientX - rect.left; // X position relative to canvas
                        } else if (event.type === 'touchstart') {
                            touchX = event.touches[0].clientX - rect.left; // X position relative to canvas for touch
                        }

                        markerPosition = mouseX || touchX;
                        markerPosition = Math.max(markerPosition, markerPositionMin);
                        markerPosition = Math.min(markerPosition, markerPositionMax);

                        drawMarker(markerPosition); // Set marker to initial click position
                        offsetX = (mouseX || touchX) - markerPosition; // Offset from click position to marker position

                        isDragging = true;

                        // Prevent text highlight in Chrome
                        document.body.style.userSelect = 'none';
                        document.getElementById('signal-meter-small-marker-canvas').oncontextmenu = function(e) { e.preventDefault(); };

                        // Start tracking mouse movement globally
                        window.addEventListener('mousemove', mouseMoveHandler);
                        window.addEventListener('touchmove', touchMoveHandler);

                        // Remove tooltip after first tap/click
                        markerCanvas.classList.remove('tooltip-meter');
                        markerCanvas.removeAttribute('data-tooltip');
                        initMeterTooltips();
                        removeTooltips();
                    }
                }

                // Mouse move handler function
                function mouseMoveHandler(event) {
                    if (isDragging) {
                        const rect = markerCanvas.getBoundingClientRect();
                        let mouseX = event.clientX - rect.left; // X position relative to canvas
                        markerPosition = mouseX - offsetX;

                        // Ensure marker stays within canvas bounds
                        markerPosition = Math.max(markerPosition, markerPositionMin);
                        markerPosition = Math.min(markerPosition, markerPositionMax);
                        drawMarker(markerPosition);
                    }
                }

                // Touch move handler function
                function touchMoveHandler(event) {
                    if (isDragging) {
                        const rect = markerCanvas.getBoundingClientRect();
                        let touchX = event.touches[0].clientX - rect.left; // X position relative to canvas
                        markerPosition = touchX - offsetX;

                        // Ensure marker stays within canvas bounds
                        markerPosition = Math.max(markerPosition, markerPositionMin);
                        markerPosition = Math.min(markerPosition, markerPositionMax);
                        drawMarker(markerPosition);
                    }
                }

                // Event listener to stop dragging
                window.addEventListener('mouseup', stopDragging);
                window.addEventListener('touchend', stopDragging);

                function stopDragging(event) {
                    if (isDragging) {
                        isDragging = false;

                        // Re-enable text selection
                        document.body.style.userSelect = '';

                        // Stop tracking mouse movement globally
                        window.removeEventListener('mousemove', mouseMoveHandler);
                        window.removeEventListener('touchmove', touchMoveHandler);
                    }
                }

                function onMouseMove(event) {
                    const rect = markerCanvas.getBoundingClientRect();
                    markerPosition = Math.max(markerPositionMin, Math.min(event.clientX - rect.left, markerPositionMax));
                    drawMarker();
                }

                markerCanvas.addEventListener('mouseleave', function() {
                    markerCanvas.removeEventListener('mousemove', onMouseMove);
                });

                // Function to handle mouse wheel scroll event
                function handleWheelScroll(event) {
                    // Calculate new position based on scroll direction
                    if (event.deltaY > 0) {
                        // Scroll down
                        markerPosition -= 2;
                    } else {
                        // Scroll up
                        markerPosition += 2;
                    }

                    // Ensure markerPosition stays within canvas bounds
                    markerPosition = Math.max(markerPosition, markerPositionMin);
                    markerPosition = Math.min(markerPosition, markerPositionMax);

                    // Clear previous marker and redraw at new position
                    markerCtx.clearRect(0, 0, markerCanvas.width, markerCanvas.height);
                    drawMarker(markerPosition);
                }

                // Add event listener for wheel event
                markerCanvas.addEventListener('wheel', handleWheelScroll);

                // Event listener to prevent webpage scrolling while scrolling over the canvas
                markerCanvas.addEventListener('wheel', function(event) {
                    event.preventDefault(); // Prevent default scrolling behaviour

                    // Remove tooltip after first tap/click
                    markerCanvas.classList.remove('tooltip-meter');
                    markerCanvas.removeAttribute('data-tooltip');
                    initMeterTooltips();
                    removeTooltips();
                });
            }

            checkWeatherPlugin();

            setInterval(function() {
                // Store current signal strength in variable
                const signalStrengthText = document.getElementById('data-signal') ? document.getElementById('data-signal').textContent : '0';
                const signalStrengthDecimalText = document.getElementById('data-signal-decimal') ? document.getElementById('data-signal-decimal').textContent : '0';
                signalStrength = parseFloat(signalStrengthText) + (signalStrengthText >= 0 ? parseFloat(signalStrengthDecimalText) : -parseFloat(signalStrengthDecimalText));
                const textContent = localStorage.getItem('signalUnit');
                signalStrength += (textContent === 'dbm' ? 120 : textContent === 'dbuv' ? 11.25 : 0);

                // Store peak signal strength in variable
                const signalStrengthHighestText = document.getElementById('data-signal-highest') ? document.getElementById('data-signal-highest').textContent : '0';
                signalStrengthHighest = parseFloat(signalStrengthHighestText);
                signalStrengthHighest += (textContent === 'dbm' ? 120 : textContent === 'dbuv' ? 11.25 : 0);

                // Resize if needed
                var width, margin;

                if (window.innerWidth > 768) {
                    switch (true) {
                        case (window.innerWidth <= 880):
                            width = '192px';
                            if (isOutsideField) { margin = (offset + 32) + 'px'; }
                            break;
                        case (window.innerWidth <= 928):
                            width = '208px';
                            if (isOutsideField) { margin = (offset + 24) + 'px'; }
                            break;
                        case (window.innerWidth <= 976):
                            width = '224px';
                            if (isOutsideField) { margin = (offset + 16) + 'px'; }
                            break;
                        case (window.innerWidth <= 1024):
                            width = '240px';
                            if (isOutsideField) { margin = (offset + 8) + 'px'; }
                            break;
                        default:
                            width = '256px';
                            margin = offset + 'px';
                    }
                    signalMeter.style.width = width;
                    signalMeter.width = parseInt(width);
                    markerCanvas.style.width = width;
                    markerCanvas.width = parseInt(width);
                    if (isOutsideField) { signalMeter.style.margin = '4px 0 0 ' + margin; }
                    if (isOutsideField) { markerCanvas.style.margin = '4px 0 0 ' + margin; } else { markerCanvas.style.margin = '4px 0 0 -' + width; }
                    if (isEnabledSquelch) { drawMarker(markerPosition); }
                } else {
                    width = '256px';
                    margin = offset + 'px';
                    signalMeter.style.width = width;
                    signalMeter.width = parseInt(width);
                    if (isEnabledSquelch) { markerCanvas.style.width = width; }
                    if (isEnabledSquelch) { markerCanvas.width = parseInt(width); }
                    if (isOutsideField) { signalMeter.style.margin = '2px 0 0 ' + margin; }
                    if (isOutsideField) { markerCanvas.style.margin = '2px 0 0 ' + margin; } else if (isEnabledSquelch) { markerCanvas.style.margin = '2px 0 0 -' + width; }
                    if (isEnabledSquelch) { drawMarker(markerPosition); }
                }

                if (!(/Mobi|Android/i.test(navigator.userAgent)) && window.innerWidth > 768 && window.innerHeight > 860) {
                    if (isOutsideField) {
                        if (document.getElementById('wrapper-outer')) {
                            // v1.2.4 compatibility
                            signalMeter.style.margin = '4px 0 0 ' + margin; // 4px is already the default
                            markerCanvas.style.margin = '4px 0 0 ' + margin; // 4px is already the default
                        } else {
                            signalMeter.style.margin = '9px 0 0 ' + margin;
                            markerCanvas.style.margin = '9px 0 0 ' + margin;
                        }
                    } else {
                        signalMeter.style.margin = '0 0 0 ' + margin;
                        if (window.innerWidth > 768 && window.innerHeight < 860) {
                            // If isOutsideField equals false and height is below 860px
                            markerCanvas.style.margin = '0 0 0 -256px';
                        } else {
                            markerCanvas.style.margin = '0 0 0 -' + width;
                        }
                    }
                }

                if (!isNaN(signalStrength)) {
                    drawSignalMeter(signalStrength, signalStrengthHighest, ctx, backgroundImage, signalMeter);
                }
            }, 200);

            // Set initial opacity from localStorage or default to 1 (visible)
            const savedOpacity = localStorage.getItem('signalMeterSmallVisibility') ? localStorage.getItem('signalMeterSmallVisibility') : 1;
            if (savedOpacity != 1) { showMarker = false; } else { showMarker = true; }
            signalMeter.style.opacity = savedOpacity !== null ? savedOpacity : '1';

            // Track if the initial mouse down position is within the first 6 pixels
            let isMouseDownWithin = false;

            // Add mousedown event listener to track initial click position
            markerCanvas.addEventListener('mousedown', function(event) {
                const rect = signalMeter.getBoundingClientRect();
                const x = event.clientX - rect.left;
                isMouseDownWithin = x <= 6;
            });

            let isMouseDoubleClickWithin = false;

            // Add dblclick event listener to track double click
            markerCanvas.addEventListener('dblclick', function(event) {
                const rect = signalMeter.getBoundingClientRect();
                const x = event.clientX - rect.left;
                isMouseDoubleClickWithin = x <= 6;

                // Handle the double click action
                if (isMouseDoubleClickWithin) {
                    const currentOpacity = signalMeter.style.opacity;
                    signalMeter.style.opacity = currentOpacity === '1' ? '0' : '1';
                    markerCanvas.style.opacity = currentOpacity === '1' ? '0' : '1'; // Hide squelch marker
                    showMarker = true;
                    localStorage.setItem('signalMeterSmallVisibility', signalMeter.style.opacity);
                    isMouseDoubleClickWithin = false; // Reset double click
                }
            });

            // Add hover effect for opacity when opacity is 0%
            markerCanvas.addEventListener('mouseover', function() {
                const currentOpacity = signalMeter.style.opacity;
                if (currentOpacity === '0') {
                    signalMeter.style.opacity = '0.2';
                }
            });

            // Remove hover effect when mouse leaves
            markerCanvas.addEventListener('mouseleave', function() {
                const currentOpacity = signalMeter.style.opacity;
                if (currentOpacity === '0.2') {
                    signalMeter.style.opacity = '0';
                }
            });
        });
    }

    function removeTooltips() {
        var tooltips = document.querySelectorAll('.tooltiptext');
        tooltips.forEach(function(tooltip) {
            tooltip.parentNode.removeChild(tooltip);
        });
    }

    var needlePosition = minMeterPosition + 1;

    // Functions to check squelch level and set volume
    function checkSquelch() {
        // Disable during playback initiation to avoid volume change conflicts
        if ($('.playbutton.bg-gray').length > 0) {
            isEnabledSquelch = false;
            markerPosition = minMeterPosition + 1;
        } else {
            isEnabledSquelch = true;
        }
        // Override any manual volume changes
        if (streamVolume !== valueSquelchVolume) { activeSquelch = false; pluginSignalMeterSmallSquelchActive = false; }
        valueSquelchVolume = streamVolume || 1;
        // Set volume to 0 if squelch is activated
        if ((markerPosition - needlePosition > 0) && !activeSquelch) {
            muteVolume(0);
            activeSquelch = true; pluginSignalMeterSmallSquelchActive = true;
        } else if ((markerPosition - needlePosition < 0) && activeSquelch) {
            muteVolume(valueSquelchVolume);
            activeSquelch = false; pluginSignalMeterSmallSquelchActive = false;
        }
    }

    function muteVolume(muteValue) {
        setTimeout(() => Stream.Volume = muteValue, 100);
        Stream.Volume = muteValue;
    }

    if (isEnabledSquelch) { setInterval(checkSquelch, 1000); }

    function drawSignalMeter(signalValue, signalValueHighest, ctx, backgroundImage, signalMeter) {
        // Clear the canvas before redrawing
        ctx.clearRect(0, 0, signalMeter.width, signalMeter.height);

        // Redraw the background image
        ctx.drawImage(backgroundImage, 0, 0, signalMeter.width, signalMeter.height - 1);

        // Draw the dark gray line in the background
        ctx.beginPath();
        ctx.moveTo(minMeterPosition, 0); // Start from the top left corner
        ctx.lineTo(signalMeter.width, 0); // Move horizontally to the right
        ctx.strokeStyle = '#212223'; // Dark Grey
        ctx.lineWidth = 8;
        ctx.stroke();

        // Calculate the needle position
        const maxPosition = (signalMeter.width + 8) / 100;
        const normalizedStrength = ((signalValue + 35) / (132)) * 100;
        needlePosition = Math.min(normalizedStrength * maxPosition, 256);

        // Calculate the peak needle position
        const normalizedStrengthHighest = ((signalValueHighest + 35) / (132)) * 100;
        needlePositionHighest = Math.min(normalizedStrengthHighest * maxPosition, 256);

        // Low signal interpolation
        if (enableLowSignalInterpolation) {
        /*
        [58 : -126 dBm / -6 dBf / -17 dBuV]
        [60 : -125 dBm / -5 dBf / -16 dBuV]
        [62 : -124 dBm / -4 dBf / -15 dBuV]
        [64 : -123 dBm / -3 dBf / -14 dBuV]
        [66 : -122 dBm / -2 dBf / -13 dBuV]
        [68 : -121 dBm / -1 dBf / -12 dBuV]
        [70 : -120 dBm /  0 dBf / -11 dBuV]
        [72 : -119 dBm /  1 dBf / -10 dBuV]
        [74 : -118 dBm /  2 dBf /  -9 dBuV]
        [76 : -117 dBm /  3 dBf /  -8 dBuV]
        */
        var sRepValue = 68; // Value in px of the reported TEF noise floor 
        var sIntValue = 24; // Value in px of the interpolated noise floor
        var sMaxValue = 86; // Value in px where signal begins to deviate
            if (needlePosition < sMaxValue) { needlePosition = sIntValue + (needlePosition - sRepValue) * (sMaxValue - sIntValue) / (sMaxValue - sRepValue); }
            if (needlePositionHighest < sMaxValue) { needlePositionHighest = sIntValue + (needlePositionHighest - sRepValue) * (sMaxValue - sIntValue) / (sMaxValue - sRepValue); }
        }

        // Never fall below line starting position
        needlePosition = Math.max(needlePosition, minMeterPosition + 1);
        needlePositionHighest = Math.max(needlePositionHighest, minMeterPosition + 1);

        // Squelch marker to never fall outside the region
        markerPositionMin = minMeterPosition + 1;
        markerPositionMax = signalMeter.width - 1;

        // Image signal locations in pixels:
        // 0, 16 | 1, 28 | 2, 40 | 3, 52 | 4, 64 | 5, 76 | 6, 88 | 7, 100 | 8, 112 | 9, 124 | +10, 144 | +20, 164 | +30, 184 | +40, 204 | +50, 224 | +60, 244
        if (debugMode) { console.log('normalizedStrength: ' + Math.round(normalizedStrength), '|| needlePosition: ' + Math.round(needlePosition), '|| signalStrength: ' + (signalStrength).toFixed(1), '|| signalStrengthHighest: ' + (signalStrengthHighest).toFixed(1)); }

        ctx.beginPath();
        ctx.moveTo(minMeterPosition, 0); // Start from the top left corner
        ctx.lineTo(Math.min((needlePositionHighest), signalMeter.width), 0); // Move horizontally to the right up to half width
        ctx.strokeStyle = '#333538'; // Grey
        ctx.lineWidth = 8;
        ctx.stroke();

        // Draw the first half of the needle in green
        ctx.beginPath();
        ctx.moveTo(minMeterPosition, 0); // Start from the top left corner
        ctx.lineTo(Math.min(needlePosition, (signalMeter.width / 2) - 4), 0); // Move horizontally to the right up to half width
        ctx.strokeStyle = '#08B818'; // Green
        if (debugMode) { if (needlePosition < sMaxValue) { ctx.strokeStyle = '#08FF18'; } }
        ctx.lineWidth = 8;
        ctx.stroke();

        // Draw the second half of the needle in red
        ctx.beginPath();
        ctx.moveTo((signalMeter.width / 2) - 4, 0); // Start from the top middle
        ctx.lineTo(Math.max((signalMeter.width / 2) - 4, needlePosition), 0); // Move horizontally to the right from half width
        ctx.strokeStyle = '#E01808'; // Red
        ctx.lineWidth = 8;
        ctx.stroke();
    }

    initSignalMeterSmall();
})();

// Tooltip
function initMeterTooltips() {
    $('.tooltip-meter').hover(function(e){
        // Never display again after first click
        $(document).on('mousedown', () => { clearTimeout($(this).data('timeout')); return; });
        if (!document.querySelector('.tooltip-meter')) { return; }

        var tooltipText = $(this).data('tooltip');
        // Add a delay of 500 milliseconds before creating and appending the tooltip
        $(this).data('timeout', setTimeout(() => {
            var tooltip = $('<div class="tooltiptext"></div>').html(tooltipText);
            $('body').append(tooltip);

            var posX = e.pageX;
            var posY = e.pageY;

            var tooltipWidth = tooltip.outerWidth();
            var tooltipHeight = tooltip.outerHeight();
            posX -= tooltipWidth / 2;
            posY -= tooltipHeight + 10;
            tooltip.css({ top: posY, left: posX, opacity: .99 }); // Set opacity to 1
        }, 500));
    }, function() {
        // Clear the timeout if the mouse leaves before the delay completes
        clearTimeout($(this).data('timeout'));
        $('.tooltiptext').remove();
    }).mousemove(function(e){
        var tooltipWidth = $('.tooltiptext').outerWidth();
        var tooltipHeight = $('.tooltiptext').outerHeight();
        var posX = e.pageX - tooltipWidth / 2;
        var posY = e.pageY - tooltipHeight - 10;

        $('.tooltiptext').css({ top: posY, left: posX });
    });
}

function checkWeatherPlugin() {
    // If the Weather plugin image height is an odd number, this creates blurry canvases and needs correcting
    let intervalCount = 0;

    function checkForImage() {
        const weatherImage = document.getElementById("weatherImage");

        // Check if the image element exists
        if (weatherImage) {
            clearInterval(interval);

            // Get the computed style of the image
            const imageStyle = getComputedStyle(weatherImage);

            // Calculate the displayed height and width based on scaling or other CSS properties
            const displayedHeight = weatherImage.naturalHeight * parseFloat(imageStyle.getPropertyValue('height')) / 100;
            const displayedWidth = weatherImage.naturalWidth * parseFloat(imageStyle.getPropertyValue('width')) / 100;

            // Check if the displayed height and width are odd or even
            const isHeightOdd = displayedHeight % 2 !== 0;
            const isWidthOdd = displayedWidth % 2 !== 0;

            // If height is odd, increase both height and width by 1 pixel
            if (isHeightOdd) {
                const newHeight = isHeightOdd ? displayedHeight + 1 : displayedHeight;
                const newWidth = isWidthOdd ? displayedWidth + 1 : displayedWidth;

                // Apply new height and width to the image
                weatherImage.setAttribute("width", newHeight + "px");
                weatherImage.setAttribute("height", newHeight + "px");

                //console.log("Image height and width increased by 1 pixel to become even.");
            } else {
                //console.error("Canvas element not found.");
            }
        } else {
            intervalCount++;
            if (intervalCount < 15) {
                setTimeout(checkForImage, 1000);
            } else {
                //console.error("Image element not found after 15 seconds.");
            }
        }
    }
    const interval = setTimeout(checkForImage, 1000);
}
