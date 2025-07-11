// USE SLEEP LOG DATA in node\public\js\sleep_today_sleeplog_by_date_bar.js 
// TO DEFINE START AND END DATETIME FOR ALL SLEEP CHARTS
// PASS START AND END DATETIME TO OTHER SLEEP CHARTS VIA setGlobalSleepChartDateRange
// 

// Flag to indicate first load
let isFirstLoadHRV = true;

function loadHrvByDateAreaData() {
    let startDate, endDate;
    
    if (isFirstLoadHRV) {
        // Default date for the first load
        endDate = new Date(); // Today
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 365); // Set start 365 days earlier than today
        isFirstLoadHRV = false;
    } else {
        // Get date from the input field after the first load
        endDate = new Date(document.getElementById("start").value);
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 365); // Set start 365 days earlier than selected date
    }

  fetch(`http://localhost:3000/api/hrv?start=${startDate}&end=${endDate}`)
    .then((response) => response.json())
    .then((data) => {
      // Group data by date and rmssdBinRange
      const groupedData = {};
      data.forEach((item) => {
        const date = new Date(item.date).toISOString();
        const range = item.rmssdBinRange;

        if (!groupedData[date]) {
          groupedData[date] = {};
        }
        if (!groupedData[date][range]) {
          groupedData[date][range] = 0;
        }
        groupedData[date][range]++;
      });

      // Prepare to sort ranges
      const ranges = Array.from(
        new Set(data.map((item) => item.rmssdBinRange))
      );

      // Custom sort function for ranges including '100+'
      ranges.sort((a, b) => {
        if (a === "100+") return 1; // Always place '100+' at the end
        if (b === "100+") return -1;
        return parseFloat(a) - parseFloat(b); // Numeric sort based on the first number
      });

      // Prepare traces for Plotly
      const traces = [];
      ranges.forEach((range) => {
        const x = [];
        const y = [];
        for (const date in groupedData) {
          x.push(date); // Using date formatted as YYYY-MM-DD
          const total = Object.values(groupedData[date]).reduce(
            (a, b) => a + b,
            0
          );
          y.push(((groupedData[date][range] || 0) / total) * 100); // Convert count to percentage
        }
        traces.push({
          x: x,
          y: y,
          type: "scatter",
          mode: "lines",
          name: range,
          stackgroup: "one", // Allows for stacked area chart
        });
      });

      var layout = {
        title: {
          text: "HRV By Date - RMSSD Ranges",
          x: 0.01, // Aligns the title to the left
          xanchor: "left", // Anchors the title text to the left edge of its container
        },
        xaxis: {
          title: "", // Simplify or remove if not needed
          type: "date",
          tickfont: { size: 10 },
          tickformat: "%Y-%m-%d", // Ensure that only the date is displayed
          //tickvals: Object.keys(groupedData), // Specify tick values to ensure no redundancy
          tickangle: -45,
          nticks: 20,
        },
        yaxis: {
          title: "", // Simplify or remove if not needed
          ticksuffix: "%",
          tickfont: { size: 10 },
        },
        margin: {
          // Reduce margin
          l: 40,
          r: 40,
          b: 60,
          t: 40, // Smaller top margin if the title is simplified
          pad: 4,
        },
        legend: {
          x: 1.1,
          xanchor: "left",
          y: 1,
        },
        autosize: true,
      };

      Plotly.newPlot("sleep_year_hrv_by_date_area", traces, layout);
    })
    .catch((error) => console.error("Error loading data:", error));
}
