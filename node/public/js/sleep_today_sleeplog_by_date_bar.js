// USE SLEEP LOG DATA in node\public\js\sleep_today_sleeplog_by_date_bar.js 
// TO DEFINE START AND END DATETIME FOR ALL SLEEP CHARTS
// PASS START AND END DATETIME TO OTHER SLEEP CHARTS VIA setGlobalSleepChartDateRange
// 

function loadSleepLogData() {
  let startDate, endDate;
  // Get date from the input field after the first load
  startDate = document.getElementById("start").value;

  // Calculate the end date (next day)
  endDate = new Date(startDate);
  //endDate.setDate(endDate.getDate() + 1);
  endDate = endDate.toISOString().split("T")[0];

  fetch(`http://localhost:3000/api/sleeplog?start=${startDate}&end=${endDate}`)
    .then((response) => response.json())
    .then((data) => {
      const datesStart = data.map((item) => new Date(item.segment_start_time));
      const datesEnd = data.map((item) => new Date(item.segment_end_time));
      //const levels = data.map((item) => item.level);

      // Create the min and max dates
      const minStart = new Date(Math.min(...datesStart));
      const maxEnd = new Date(Math.max(...datesEnd));

    // USE SLEEP LOG DATA TO DEFINE START AND END DATETIME FOR ALL SLEEP CHARTS
      // CALCULATE EDT VALUE - Add 4 hours (240 minutes) to convert to the correct EDT time
      // FOR DAYLIGHT SAVINGS - Add 3.5 hours (210 minutes) to convert to the correct EDT time
      const adjustedStart = new Date(minStart.getTime() + 210 * 60000);
      const adjustedEnd = new Date(maxEnd.getTime() + 210 * 60000);

    // PASS START AND END DATETIME TO OTHER SLEEP CHARTS VIA setGlobalSleepChartDateRange
      // Set the global sleep chart date range using the formatted local times
      setGlobalSleepChartDateRange(adjustedStart, adjustedEnd);

      // Apply level replacements and generate shapes
      const shapes = generateTimeBlocks(
        data.map((item) => {
          item.level = getMappedLevel(item.level);
          return item;
        })
      );

      // Fetch daily sleep summary data from the new API endpoint
      fetch(
        `http://localhost:3000/api/sleeplog_daily?start=${startDate}&end=${endDate}`
      )
        .then((response) => response.json())
        .then((dailyData) => {
          // Process the daily sleep data and create the updated title
          const { minutesAsleep, minutesAwake, startTime, endTime, minutesDeep, minutesRem, minutesLight, minutesDeepAvg30day, minutesRemAvg30day, minutesLightAvg30day } =
            dailyData[0];

          // Convert minutes to hours and minutes
          const asleepHours = Math.floor(minutesAsleep / 60);
          const asleepMinutes = minutesAsleep % 60;
          const awakeHours = Math.floor(minutesAwake / 60);
          const awakeMinutes = minutesAwake % 60;

          // Convert sleep stage minutes to hours and minutes (ensure integers)
          const deepHours = Math.floor(Math.round(minutesDeep || 0) / 60);
          const deepMinutes = Math.round(minutesDeep || 0) % 60;
          const remHours = Math.floor(Math.round(minutesRem || 0) / 60);
          const remMinutes = Math.round(minutesRem || 0) % 60;
          const lightHours = Math.floor(Math.round(minutesLight || 0) / 60);
          const lightMinutes = Math.round(minutesLight || 0) % 60;

          // Convert 30-day average minutes to hours and minutes (ensure integers)
          const deepAvgHours = Math.floor(Math.round(minutesDeepAvg30day || 0) / 60);
          const deepAvgMinutes = Math.round(minutesDeepAvg30day || 0) % 60;
          const remAvgHours = Math.floor(Math.round(minutesRemAvg30day || 0) / 60);
          const remAvgMinutes = Math.round(minutesRemAvg30day || 0) % 60;
          const lightAvgHours = Math.floor(Math.round(minutesLightAvg30day || 0) / 60);
          const lightAvgMinutes = Math.round(minutesLightAvg30day || 0) % 60;

          // Format start and end times
          const startTimeFormatted = new Date(startTime).toLocaleString(
            "en-US"
          );
          const endTimeFormatted = new Date(endTime).toLocaleString("en-US");

          // Create the updated title with sleep stage breakdown
          const titleText = `Sleep Stages: Asleep: ${asleepHours}h ${asleepMinutes}m | Awake: ${awakeHours}h ${awakeMinutes}m | Start: ${startTimeFormatted} | End: ${endTimeFormatted}<br><span style="font-size: 80%;">Today/30-Day Avg: Deep: ${deepHours}h ${deepMinutes}m / ${deepAvgHours}h ${deepAvgMinutes}m, REM: ${remHours}h ${remMinutes}m / ${remAvgHours}h ${remAvgMinutes}m, Light: ${lightHours}h ${lightMinutes}m / ${lightAvgHours}h ${lightAvgMinutes}m</span> | <a href="screenshots/sleep_index/sleep_today_sleeplog_by_date_bar.html" style="color: #387ADF; text-decoration: underline;">view all days</a>`;
          
          // Generate dummy traces for the legend
          const stages = ["deep", "light", "rem", "wake", "short_wake"];
          var traces = stages.map((stage) => ({
            x: [null],
            y: [null],
            mode: "markers",
            marker: {
              size: 20,
              color: getStageColor(stage),
            },
            name:
              stage.replace("_", " ").charAt(0).toUpperCase() +
              stage.replace("_", " ").slice(1), // Capitalize the first letter
          }));

          var layout = {
            title: {
              text: titleText,
              x: 0.01, // Aligns the title to the left
              xanchor: "left", // Anchors the title text to the left edge of its container
              font: {
                size: 16, // Set font size (default is usually around 14-16)
                color: '#333333', // Optional: set font color
                family: 'Arial, sans-serif' // Optional: set font family
              }
            },
            xaxis: {
              title: "",
              type: "date",
              range: [adjustedStart, adjustedEnd],
              tickfont: { size: 10 },
            },
            yaxis: {
              title: "",
              range: [0, 1],
              showticklabels: true,
            },
            shapes: shapes,
            margin: {
              l: 40,
              r: 40,
              b: 40,
              t: 60, // Increased top margin to accommodate two-line title
              pad: 4,
            },
            legend: {
              x: 1.1,
              xanchor: "left",
              y: 1,
            },
            autosize: true,
          };

          Plotly.newPlot("sleep_today_sleeplog_by_date_bar", traces, layout).then(() => {
            const dateInput = document.getElementById('start');
            const dateStr = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().slice(0,10);
            captureChart('sleep_today_sleeplog', dateStr, 'sleep_today_sleeplog_by_date_bar');
          });
        })
        .catch((error) =>
          console.error("Error loading sleeplog_daily data:", error)
        );
    })
    .catch((error) => console.error("Error loading sleeplog data:", error));
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
