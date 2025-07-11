// USE SLEEP LOG DATA in node\public\js\sleep_today_sleeplog_by_date_bar.js 
// TO DEFINE START AND END DATETIME FOR ALL SLEEP CHARTS
// PASS START AND END DATETIME TO OTHER SLEEP CHARTS VIA setGlobalSleepChartDateRange
// 

// Flag to indicate first load
let isFirstLoadSpO2 = true;

function loadSpo2ByDateBarData() {
    let startDate, endDate;
    
    if (isFirstLoadSpO2) {
        // Default date for the first load
        endDate = new Date(); // Today
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 365); // Set start 365 days earlier than today
        isFirstLoadSpO2 = false;
    } else {
        // Get date from the input field after the first load
        endDate = new Date(document.getElementById("start").value);
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 365); // Set start 365 days earlier than selected date
    }

  fetch(`http://localhost:3000/api/spo2?start=${startDate}&end=${endDate}`)
    .then((response) => response.json())
    .then((data) => {
      const desiredMinimum = 95;
      let dailyData = {};

      // Organize data by date using the 'date' field directly
      data.forEach((item) => {
        const dateStr = item.date; //.toISOString().split("T")[0]; // Use the 'date' field directly
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = {
            countAbove: 0,
            countBelow: 0,
            total: 0,
            dailyAverage: 0,
            dailyTotal: 0,
          };
        }
        if (item.spo2 >= desiredMinimum) {
          dailyData[dateStr].countAbove++;
        } else {
          dailyData[dateStr].countBelow++;
        }
        dailyData[dateStr].total++;
        dailyData[dateStr].dailyAverage += item.spo2;
        dailyData[dateStr].dailyTotal++;
      });
      
      // Prepare plot data
      const dates = [];
      const percentAbove = [];
      const percentBelow = [];
      const dailyAverages = [];

      Object.keys(dailyData).forEach((date) => {
        const dayData = dailyData[date];
        // Correctly handle the date to ensure it reflects the local date without time zone offset
        const parts = date.split("-");
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Months are zero-indexed
        const day = parseInt(parts[2], 10);
        dates.push(new Date(year, month, day));

        percentAbove.push((dayData.countAbove / dayData.total) * 100);
        percentBelow.push((-dayData.countBelow / dayData.total) * 100);
        dailyAverages.push(dayData.dailyAverage / dayData.dailyTotal);
      });

      var traces = [
        {
          x: dates,
          y: percentAbove,
          name: "Above Desired Minimum",
          type: "bar",
          marker: { 
            color: 'rgba(0, 128, 128, 0.7)',  // teal
         }
        },
        {
          x: dates,
          y: percentBelow,
          name: "Below Desired Minimum",
          type: "bar",
          marker: { 
            color: 'rgba(247, 127, 0, 0.7)',  // Cardio orange
         }
        },
        {
          x: dates,
          y: dailyAverages,
          type: "scatter",
          mode: "lines+markers",
          name: "Daily Average",
          marker: { color: "black", size: 5 },
          yaxis: "y2",
        },
      ];

      var layout = {
        title: {
          text: "Spo2 By Date - Relative to 95% Goal (PW2 > 2024-04-05)",
          x: 0.01, // Aligns the title to the left
          xanchor: "left", // Anchors the title text to the left edge of its container
        },
        xaxis: {
          type: "date",
          tickfont: { size: 10 },
          tickformat: "%Y-%m-%d",
          //tickvals: dates,
          tickangle: -45,
          nticks: 20,
        },
        yaxis: {
          title: "",
          rangemode: "tozero",
          range: [-100, 100],
          ticksuffix: "%",
          tickfont: { size: 10 },
        },
        yaxis2: {
          overlaying: "y",
          side: "right",
          range: [90, 100],
          ticksuffix: "%",
          tickfont: { size: 10 },
        },
        barmode: "relative",
        margin: {
          // Reduce margin
          l: 40,
          r: 40,
          b: 60,
          t: 40, // Smaller top margin if the title is removed
          pad: 4,
        },
        legend: {
          x: 1.03,
          xanchor: "left",
          y: 1,
        },
        autosize: true,
      };

      Plotly.newPlot("sleep_year_spo2_by_date_bar", traces, layout);
    })
    .catch((error) => console.error("Error loading data:", error));
}
