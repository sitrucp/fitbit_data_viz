function loadHrvByDateScatterData() {

    // Get page dates
    const startDate = document.getElementById("start").value;
    const endDate = document.getElementById("end").value;
    
  fetch(`http://localhost:3000/api/hrv?start=${startDate}&end=${endDate}`)
    .then((response) => response.json())
    .then((data) => {
      const dates = data.map((item) => new Date(item.dateTime));
      const rmssd = data.map((item) => item.rmssd);
      const dailyAverageRmssd = data.map((item) => item.dailyAverageRmssd);

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
            text: "HRV",
            x: 0.01, // Aligns the title to the left
            xanchor: 'left' // Anchors the title text to the left edge of its container
        },
        xaxis: {
          title: "", // Removing title for compactness
          type: "date",
          tickfont: { size: 10 },
        },
        yaxis: {
          title: "", // Removing title for compactness
          range: [0, "auto"],
          tickfont: { size: 10 },
        },
        margin: {
          // Consistent margin
          l: 40,
          r: 40,
          b: 40,
          t: 40, // Reduced to improve space usage
          pad: 4,
        },
        legend: {
          x: 1,
          xanchor: "left",
          y: 1,
        },
        autosize: true,
      };

      Plotly.newPlot("hrv_by_date_scatter", traces, layout);
    })
    .catch((error) => console.error("Error loading data:", error));
}
