import * as d3 from 'd3';

export function parseCSV(csv, dataType) {
    const lines = csv.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(header => header.trim().toLowerCase());

    const requiredColumns = [
        ['post url', 'ost url', 'url'],
        ['post publish date', 'post published date', 'published date', 'date'],
        dataType === 'engagement' ? ['engagement', 'engagements', 'engagement', 'engagements'] : ['impressions']
    ];

    const columnIndexes = requiredColumns.map(columnVariations => {
        const index = columnVariations.findIndex(variation => headers.includes(variation));
        if (index === -1) {
            throw new Error(`Missing required column: ${columnVariations.join(' or ')}`);
        }
        return headers.indexOf(columnVariations[index]);
    });

    const [urlIndex, dateIndex, valueIndex] = columnIndexes;

    const parsedData = lines.slice(1)
        .map(line => {
            const values = line.split(',');
            if (values.length <= Math.max(urlIndex, dateIndex, valueIndex)) {
                console.warn('Skipping line with insufficient data:', line);
                return null;
            }
            return {
                url: values[urlIndex]?.trim() || '',
                date: new Date(values[dateIndex]?.trim() || ''),
                [dataType]: parseInt(values[valueIndex]?.trim() || '0', 10)
            };
        })
        .filter(item => item !== null && !isNaN(item.date.getTime()) && !isNaN(item[dataType]));

    if (parsedData.length === 0) {
        throw new Error('No valid data found in the CSV file.');
    }

    return parsedData;
}

export function createHeatmap(data, container, dataType) {
    // Clear existing content
    d3.select(container).selectAll("*").remove();

    const width = container.clientWidth;
    const height = container.clientHeight;
    const cellSize = 30;
    const monthLabelHeight = 20;
    const monthMargin = 50; // Minimum margin between months
    const margin = { top: 40, right: 40, bottom: 80, left: 40 }; // Reduced bottom margin
    const legendSpacing = 30; // Changed from 100 to 30

    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const monthWidth = cellSize * 7 + monthMargin; // 7 days per week + margin
    const calendarWidth = monthWidth * 4; // 4 months per row
    const xOffset = (width - calendarWidth) / 2; // Center the calendar horizontally

    const calendarGroup = svg.append("g")
        .attr("transform", `translate(${margin.left + xOffset}, ${margin.top})`);

    const minValue = d3.min(data, d => d[dataType]);
    const maxValue = d3.max(data, d => d[dataType]);

    const colorScale = d3.scaleSequential(d3.interpolateRgb("#e8f3ec", "#34c759"))
        .domain([minValue, maxValue]);

    const months = [
        "September", "October", "November", "December",
        "January", "February", "March", "April",
        "May", "June", "July", "August"
    ];

    function generateMonthCalendar(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        let calendar = [];
        
        for (let i = 0; i < startingDay; i++) {
            calendar.push(null);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = date.toISOString().split('T')[0];
            const post = data.find(p => p.date && p.date.toISOString().split('T')[0] === dateString);
            calendar.push({
                date: date,
                hasPost: !!post,
                url: post ? post.url : null,
                [dataType]: post ? post[dataType] : null
            });
        }
        
        return calendar;
    }

    function renderMonth(year, month, index) {
        const calendar = generateMonthCalendar(year, month);
        const monthGroup = calendarGroup.append("g")
            .attr("transform", `translate(${(index % 4) * monthWidth}, ${Math.floor(index / 4) * (cellSize * 6 + monthLabelHeight + monthMargin)})`);

        monthGroup.append("text")
            .attr("x", cellSize * 3.5)
            .attr("y", monthLabelHeight)
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .text(`${months[index]} ${year}`);

        const days = monthGroup.selectAll(".day")
            .data(calendar)
            .enter().append("g")
            .attr("class", "day")
            .attr("transform", (d, i) => `translate(${(i % 7) * cellSize}, ${Math.floor(i / 7) * cellSize + monthLabelHeight + 20})`);

        days.append("rect")
            .attr("width", cellSize - 2)
            .attr("height", cellSize - 2)
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("fill", d => d && d.hasPost ? colorScale(d[dataType]) : "#f5f5f7");

        days.append("text")
            .attr("x", cellSize / 2)
            .attr("y", cellSize / 2)
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .text(d => d ? d.date.getDate() : "")
            .attr("fill", d => d && d.hasPost ? (d3.color(colorScale(d[dataType])).darker(2)) : "#8e8e93")
            .attr("font-size", "12px");

        // Update tooltip style
        const tooltip = d3.select(container)
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "rgba(255, 255, 255, 0.9)")
            .style("border-radius", "8px")
            .style("padding", "12px")
            .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
            .style("font-size", "14px")
            .style("line-height", "1.4")
            .style("pointer-events", "none");

        // Update hover effect and engagement display
        days.filter(d => d && d.hasPost)
            .on("mouseover", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 1);
                tooltip.html(`
                    <strong>Date:</strong> ${d.date.toLocaleDateString()}<br>
                    <strong>${dataType.charAt(0).toUpperCase() + dataType.slice(1)}:</strong> ${d[dataType]}<br>
                    <small>Click to view post</small>
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .on("click", (event, d) => window.open(d.url, "_blank"));

        // Remove any existing engagement value displays
        days.selectAll(".engagement-value").remove();
        days.selectAll("title").remove();

        // ... rest of the function
    }

    months.forEach((_, index) => {
        const year = index < 4 ? 2023 : 2024;
        const month = index < 4 ? index + 8 : index - 4;
        renderMonth(year, month, index);
    });

    // Calculate the height of the calendar
    const calendarHeight = (cellSize * 6 + monthLabelHeight + monthMargin) * 3;

    // Update legend style and position
    const legendGroup = svg.append("g")
        .attr("transform", `translate(${width / 2 - 150}, ${margin.top + calendarHeight + legendSpacing})`);

    const gradient = legendGroup.append("defs")
        .append("linearGradient")
        .attr("id", "value-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(minValue));

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale(maxValue));

    legendGroup.append("rect")
        .attr("width", 300)
        .attr("height", 8)
        .attr("rx", 4)
        .attr("ry", 4)
        .style("fill", "url(#value-gradient)");

    legendGroup.append("text")
        .attr("x", -5)
        .attr("y", 20)
        .attr("text-anchor", "end")
        .attr("font-size", "12px")
        .attr("fill", "#8e8e93")
        .text(`${minValue}`);

    legendGroup.append("text")
        .attr("x", 305)
        .attr("y", 20)
        .attr("text-anchor", "start")
        .attr("font-size", "12px")
        .attr("fill", "#8e8e93")
        .text(`${maxValue}`);

    legendGroup.append("text")
        .attr("x", 150)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "500")
        .attr("fill", "#1d1d1f")
        .text(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`);

    // Adjust SVG height to fit the calendar, spacing, and legend
    const totalHeight = margin.top + calendarHeight + legendSpacing + 50 + margin.bottom; // 50 is approx. legend height
    svg.attr("height", Math.max(height, totalHeight));

    // ... rest of the function
}

// ... other utility functions