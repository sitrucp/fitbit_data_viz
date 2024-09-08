// Flag to indicate first load
let isFirstLoadBR = true;

function loadBrByDateScatterData() {
    let startDate, endDate;
    
    if (isFirstLoadBR) {
        // Default date for the first load
        endDate = new Date(); // Today
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 365); // Set start 365 days earlier than today
        isFirstLoadBR = false;
    } else {
        // Get date from the input field after the first load
        endDate = new Date(document.getElementById("start").value);
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 365); // Set start 365 days earlier than selected date
    }

    fetch(`http://localhost:3000/api/br?start=${startDate}&end=${endDate}`)
        .then(response => response.json())
        .then(data => {
            const fullSleepBr = data.map(item => item.fullSleepBr);
            const deepSleepBr = data.map(item => item.deepSleepBr);
            const lightSleepBr = data.map(item => item.lightSleepBr);
            const remSleepBr = data.map(item => item.remSleepBr);
            const dates = data.map(item => {
                // Manually parse the date to avoid timezone issues
                const parts = item.date.split('-'); // split yyyy-mm-dd
                // Note: months are 0-indexed in JavaScript Date
                return new Date(parts[0], parts[1] - 1, parts[2]);
            });

            const maxBr = Math.max(...fullSleepBr);
            const minBr = Math.min(...fullSleepBr);
            const avgBr = (fullSleepBr.reduce((a, b) => a + b, 0) / fullSleepBr.length).toFixed(1);

            var traces = [
                {
                  x: dates,
                  y: fullSleepBr,
                  mode: 'lines+markers',
                  type: "scatter",
                  name: "Breathing Rate",
                  marker: { color: "black", size: 3 },
                }
              ];
        
              var layout = {
                title: {
                    //text: "Breathing Rate",
                    text: `Breathing Rate (Avg: ${avgBr} bpm, Max: ${maxBr} bpm, Min: ${minBr} bpm)`,
                    x: 0.01, // Aligns the title to the left
                    xanchor: 'left' // Anchors the title text to the left edge of its container
                },
                xaxis: {
                    type: "date",
                    tickfont: { size: 10 },
                    tickformat: "%Y-%m-%d",
                    //tickvals: dates,
                    tickangle: -45,
                      nticks: 20
                  },
                yaxis: {
                  title: "", // Removing title for compactness
                  range: [9, 16],
                  tickfont: { size: 10 },
                },
                margin: {
                  // Consistent margin
                  l: 40,
                  r: 40,
                  b: 60,
                  t: 40, // Reduced to improve space usage
                  pad: 4,
                },
                showlegend: true,
                legend: {
                 x: 1.03,
                  xanchor: "left",
                  y: 1,
                },
                autosize: true,
              };

            Plotly.newPlot('sleep_year_br_by_date_scatter', traces, layout);
        })
        .catch(error => console.error('Error loading data:', error));
}