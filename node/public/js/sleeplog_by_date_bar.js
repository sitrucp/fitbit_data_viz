function loadSleepLogData() {

    // Get page dates
    const startDate = document.getElementById("start").value;
    const endDate = document.getElementById("end").value;
    
  fetch(`http://localhost:3000/api/sleeplog?start=${startDate}&end=${endDate}`)
    .then((response) => response.json())
    .then((data) => {
      const datesStart = data.map((item) => new Date(item.segment_start_time));
      const datesEnd = data.map((item) => new Date(item.segment_end_time));
      const levels = data.map((item) => item.level);

      // Apply level replacements and generate shapes
      const shapes = generateTimeBlocks(
        data.map((item) => {
          item.level = getMappedLevel(item.level);
          return item;
        })
      );

      // Apply level replacements as per Python code before processing data
      data.forEach((item) => {
        item.level = getMappedLevel(item.level);
      });

      // Generate dummy traces for the legend
      const stages = ['deep', 'light', 'rem', 'wake', 'short_wake'];
      var traces = stages.map(stage => ({
        x: [null],
        y: [null],
        mode: 'markers',
        marker: {
          size: 20,
          color: getStageColor(stage)
        },
        name: stage.replace('_', ' ').charAt(0).toUpperCase() + stage.replace('_', ' ').slice(1) // Capitalize the first letter
      }));

      var layout = {
        title: {
          text: "Sleep Stages",
          x: 0.01, // Aligns the title to the left
          xanchor: "left", // Anchors the title text to the left edge of its container
        },
        xaxis: {
          title: "",
          type: "date",
          tickfont: { size: 10 },
        },
        yaxis: {
          title: "",
          range: [0, 1],
          showticklabels: true,
        },
        shapes: shapes,
        margin: {
          // Reduce margin
          l: 40,
          r: 40,
          b: 40,
          t: 40, // Smaller top margin if the title is removed
          pad: 4,
        },
        legend: {
            x: 1.1,
          xanchor: "left",
          y: 1,
        },
        autosize: true,
      };

      Plotly.newPlot("sleeplog_by_date_bar", traces, layout);
    })
    .catch((error) => console.error("Error loading data:", error));
}

function getMappedLevel(level) {
  const levelReplacementMap = {
    awake: "wake",
    restless: "wake",
    unknown: "wake",
    asleep: "light",
  };
  return levelReplacementMap[level] || level;
}

// Function to generate shaded time blocks for the sleep stages
function generateTimeBlocks(data) {
  return data.map((item) => ({
    type: "rect",
    x0: item.segment_start_time,
    x1: item.segment_end_time,
    y0: 0,
    y1: 1,
    fillcolor: getStageColor(item.level),
    opacity: 1.0,
    line: { width: 0 },
  }));
}

// Helper function to assign colors to sleep stages
function getStageColor(stage) {
  switch (stage) {
    case "deep":
      return "#333A73";
    case "light":
      return "#387ADF";
    case "rem":
      return "#50C4ED";
    case "wake":
      return "#FF407D";
    case "short_wake":
      return "#FFDDE8";
  }
}
