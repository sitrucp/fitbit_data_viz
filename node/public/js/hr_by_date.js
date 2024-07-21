function loadHRByDateData() {
  // Get page dates
  const startDate = document.getElementById("start").value;
  const endDate = document.getElementById("end").value;

  fetch(`http://localhost:3000/api/hr?start=${startDate}&end=${endDate}`)
    .then((response) => response.json())
    .then((data) => {
      const dates = data
        .map((item) => new Date(item.dateTime))
        .filter((date) => date.getHours() < 9);
      const heartRate = data
        .filter((item) => new Date(item.dateTime).getHours() < 9)
        .map((item) => item.heartRate);
      const restingHeartRates = data
        .filter((item) => new Date(item.dateTime).getHours() < 9)
        .map((item) => item.restingHeartRate);

      // Calculate colors for each heart rate based on zones
      const heartRateColors = heartRate.map((rate) => {
        if (rate < 97) return "rgb(0, 128, 128)"; // Normal
        else if (rate < 120) return "rgb(252, 191, 73)"; // Fat Burn
        else if (rate < 148) return "rgb(247, 127, 0)"; // Cardio
        else return "rgb(214, 40, 40)"; // Peak
      });

      var trace1 = {
        x: dates,
        y: heartRate,
        mode: "markers",
        type: "scatter",
        name: "Heart Rate",
        marker: { color: heartRateColors, size: 3 },
      };

      var trace2 = {
        x: dates,
        y: restingHeartRates,
        mode: "lines",
        type: "scatter",
        name: "Resting Heart Rate",
        line: {
          color: "rgba(255, 99, 132, 1)", // pink
          dash: "dash",
        },
      };

      var layout = {
        title: {
          text: "Heart Rate",
          x: 0.01, // Aligns the title to the left
          xanchor: "left", // Anchors the title text to the left edge of its container
        },
        xaxis: {
          title: "", // Consider removing if not necessary
          type: "date",
          tickfont: { size: 10 },
        },
        yaxis: {
          title: "", // Consider removing if not necessary
          range: [30, "auto"],
          tickfont: { size: 10 },
        },
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
          //orientation: 'h' // Horizontal legend to save vertical space
        },
        autosize: true,
      };

      Plotly.newPlot("hr_by_date", [trace1, trace2], layout);
    })
    .catch((error) => {
      console.error("Error loading data:", error);
      alert("An error occurred while loading the data. Please try again.");
    });
}
