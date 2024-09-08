function loadSpo2ByDateScatterData() {
    let startDate, endDate;
    // Get date from the input field after the first load
    startDate = document.getElementById("start").value;

    // Calculate the end date (next day)
    endDate = new Date(startDate);
    //endDate.setDate(endDate.getDate() + 1);
    endDate = endDate.toISOString().split('T')[0];   

    fetch(`http://localhost:3000/api/spo2?start=${startDate}&end=${endDate}`)
        .then(response => response.json())
        .then(data => {
            const dates = data.map(item => new Date(item.dateTime));
            const spo2 = data.map(item => item.spo2);
            const dailyAvg = data.map(item => item.dailyAvg);

            const maxSpo2 = Math.max(...spo2);
            const minSpo2 = Math.min(...spo2);
            const avgSpo2 = (spo2.reduce((a, b) => a + b, 0) / spo2.length).toFixed(1);

            const { sleepChartStartTime, sleepChartEndTime } = getGlobalSleepChartDateRange();

            var traces = [
                {
                    x: dates,
                    y: spo2,
                    mode: "markers",
                    type: "scatter",
                    name: "SpO2 Measurements",
                    marker: { color: "black", size: 3 },
                },
                {
                    x: dates,
                    y: dailyAvg,
                    mode: 'lines',
                    type: 'scatter',
                    name: 'Daily Average',
                    line: {
                        color: "rgba(255, 99, 132, 1)",
                        dash: "dash",
                    },
                },
                {
                    x: [null],  // No actual data points
                    y: [null],
                    mode: "lines",
                    type: "scatter",
                    name: "SpO2 95% Goal",
                    line: {
                        color: 'rgba(255, 99, 132, 1)', // pink
                        dash: 'dashdot',
                    },
                    showlegend: true,
                },
            ];

            var layout = {
                title: {
                    text: `SpO2 (Avg: ${avgSpo2}%, Max: ${maxSpo2}%, Min: ${minSpo2}%)`,
                    x: 0.01,
                    xanchor: 'left'
                },
                xaxis: {
                    type: "date",
                    tickfont: { size: 10 },
                    range: [sleepChartStartTime, sleepChartEndTime],
                },
                yaxis: {
                    title: "",
                    range: ['auto', 100],
                    ticksuffix: "%",
                    tickfont: { size: 10 }
                },
                shapes: [
                    {
                        name: "SpO2 95%",
                        type: "line",
                        x0: dates[0],
                        x1: dates[dates.length - 1],
                        y0: 95,
                        y1: 95,
                        line: {
                            color: 'rgba(255, 99, 132, 1)', // pink
                            dash: 'dashdot',
                        },
                    },
                ],
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

            Plotly.newPlot("sleep_today_spo2_by_date_scatter", traces, layout);
        })
        .catch(error => console.error("Error loading SpO2 data:", error));
}
