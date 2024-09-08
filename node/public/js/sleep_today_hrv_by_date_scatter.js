function loadHrvByDateScatterData() {
    let startDate, endDate;
    // Get date from the input field after the first load
    startDate = document.getElementById("start").value;

    // Calculate the end date (next day)
    endDate = new Date(startDate);
    //endDate.setDate(endDate.getDate() + 1);
    endDate = endDate.toISOString().split('T')[0];   

    fetch(`http://localhost:3000/api/hrv?start=${startDate}&end=${endDate}`)
        .then(response => response.json())
        .then(data => {
            const dates = data.map(item => new Date(item.dateTime));
            const rmssd = data.map(item => item.rmssd);
            const dailyAverageRmssd = data.map(item => item.dailyAverageRmssd);

            const maxHrv = Math.max(...rmssd);
            const minHrv = Math.min(...rmssd);
            const avgHrv = (rmssd.reduce((a, b) => a + b, 0) / rmssd.length).toFixed(1);

            const { sleepChartStartTime, sleepChartEndTime } = getGlobalSleepChartDateRange();

            var traces = [
                {
                    x: dates,
                    y: rmssd,
                    mode: 'markers',
                    type: "scatter",
                    name: "RMSSD Measurements",
                    marker: { color: "black", size: 3 },
                },
                {
                    x: dates,
                    y: dailyAverageRmssd,
                    mode: "lines",
                    type: "scatter",
                    name: "Daily Average",
                    line: {
                        color: 'rgba(255, 99, 132, 1)', // pink
                        dash: 'dash',
                    }
                },
            ];

            var layout = {
                title: {
                    text: `HRV (Avg: ${avgHrv} ms, Max: ${maxHrv} ms, Min: ${minHrv} ms)`,
                    x: 0.01,
                    xanchor: 'left'
                },
                xaxis: {
                    title: "",
                    type: "date",
                    range: [sleepChartStartTime, sleepChartEndTime],
                    tickfont: { size: 10 }
                },
                yaxis: {
                    title: "",
                    range: [0, "auto"],
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

            Plotly.newPlot("sleep_today_hrv_by_date_scatter", traces, layout);
        })
        .catch(error => console.error("Error loading HRV data:", error));
}
