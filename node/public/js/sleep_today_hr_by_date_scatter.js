// USE SLEEP LOG DATA in node\public\js\sleep_today_sleeplog_by_date_bar.js 
// TO DEFINE START AND END DATETIME FOR ALL SLEEP CHARTS
// PASS START AND END DATETIME TO OTHER SLEEP CHARTS VIA setGlobalSleepChartDateRange
// 

function loadHRByDateData() {
    let startDate, endDate;
    // Get date from the input field after the first load
    startDate = document.getElementById("start").value;

    // Calculate the end date (next day)
    endDate = new Date(startDate);
    //endDate.setDate(endDate.getDate() + 1);
    endDate = endDate.toISOString().split('T')[0];

    fetch(`http://localhost:3000/api/hr?start=${startDate}&end=${endDate}`)
        .then(response => response.json())
        .then(data => {
            const dates = data.map(item => new Date(item.dateTime));
            const heartRate = data.map(item => item.heartRate);
            const restingHeartRates = data.map(item => item.restingHeartRate);

            const maxHeartRate = Math.max(...heartRate);
            const minHeartRate = Math.min(...heartRate);
            const avgHeartRate = (heartRate.reduce((a, b) => a + b, 0) / heartRate.length).toFixed(0);

            const avgRestingHeartRate = (restingHeartRates.reduce((a, b) => a + b, 0) / restingHeartRates.length).toFixed(0); // Calculate average resting heart rate

            const heartRateColors = heartRate.map((rate) => {
                if (rate < 97) return "rgb(0, 128, 128)"; // Normal
                else if (rate < 120) return "rgb(252, 191, 73)"; // Fat Burn
                else if (rate < 148) return "rgb(247, 127, 0)"; // Cardio
                else return "rgb(214, 40, 40)"; // Peak
            });

            const { sleepChartStartTime, sleepChartEndTime } = getGlobalSleepChartDateRange();

            var trace1 = {
                x: dates,
                y: heartRate,
                mode: "markers",
                type: "scatter",
                name: "Heart Rate",
                marker: { color: heartRateColors, size: 3 }
            };

            var trace2 = {
                x: dates,
                y: restingHeartRates,
                mode: "lines",
                type: "scatter",
                name: "Resting Heart Rate",
                line: {
                    color: "rgba(255, 99, 132, 1)",
                    dash: "dash"
                }
            };

            var layout = {
                title: {
                    text: `Heart Rate (Avg: ${avgHeartRate} bpm, Max: ${maxHeartRate} bpm, Min: ${minHeartRate} bpm, Resting Heart Rate: ${avgRestingHeartRate} bpm)`,
                    x: 0.01,
                    xanchor: "left"
                },
                xaxis: {
                    title: "",
                    type: "date",
                    range: [sleepChartStartTime, sleepChartEndTime],
                    tickfont: { size: 10 }
                },
                yaxis: {
                    title: "",
                    range: [30, "auto"],
                    tickfont: { size: 10 }
                },
                margin: {
                    l: 40,
                    r: 40,
                    b: 40,
                    t: 40,
                    pad: 4
                },
                legend: {
                    x: 1,
                    xanchor: "left",
                    y: 1
                },
                autosize: true
            };

            Plotly.newPlot("sleep_today_hr_by_date_scatter", [trace1, trace2], layout);
        })
        .catch(error => {
            console.error("Error loading HR data:", error);
            alert("An error occurred while loading the data. Please try again.");
        });
}
