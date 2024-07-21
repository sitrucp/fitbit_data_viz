function loadSpo2ByDateScatterData() {

    // Get page dates
    const startDate = document.getElementById("start").value;
    const endDate = document.getElementById("end").value;

  fetch(`http://localhost:3000/api/spo2?start=${startDate}&end=${endDate}`)
    .then((response) => response.json())
    .then((data) => {
      const dates = data.map((item) => new Date(item.dateTime));
      const spo2 = data.map((item) => item.spo2);
      const dailyAvg = data.map((item) => item.dailyAvg);

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
                color: "rgba(255, 99, 132, 1)", // pink
                dash: "dash",
            },
        },
        {
          x: [null], // No actual data points
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
            text: "Spo2",
            x: 0.01, // Aligns the title to the left
            xanchor: 'left' // Anchors the title text to the left edge of its container
        },
        xaxis: {
          type: "date",
          tickfont: { size: 10 },
        },
        yaxis: {
          title: "",
          range: ['auto', 100],
          ticksuffix: "%",
          tickfont: { size: 10 },
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
          // Reduce margin
          l: 40,
          r: 40,
          b: 40,
          t: 40, // Smaller top margin if the title is removed
          pad: 4,
        },
        legend: {
          x: 1,
          xanchor: "left",
          y: 1,
        },
        autosize: true,
      };

      Plotly.newPlot("spo2_by_date_scatter", traces, layout);
    })
    .catch((error) => console.error("Error loading data:", error));
}
