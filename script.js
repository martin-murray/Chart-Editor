// Default configuration
const defaultConfig = {
    chartType: 'bar',
    chartTitle: 'Sales Data',
    dataLabels: 'Q1, Q2, Q3, Q4',
    dataValues: '65, 59, 80, 81',
    datasetLabel: 'Sales'
};

// Initialize chart on page load
document.addEventListener('DOMContentLoaded', function() {
    createChart();
    
    // Event listeners
    document.getElementById('updateChart').addEventListener('click', updateChart);
    document.getElementById('resetChart').addEventListener('click', resetChart);
});

function createChart() {
    const canvas = document.getElementById('myChart');
    const ctx = canvas.getContext('2d');
    
    const chartType = document.getElementById('chartType').value;
    const title = document.getElementById('chartTitle').value;
    const labels = document.getElementById('dataLabels').value.split(',').map(l => l.trim());
    const values = document.getElementById('dataValues').value.split(',').map(v => parseFloat(v.trim()));
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Draw chart based on type
    if (chartType === 'bar') {
        drawBarChart(ctx, canvas, title, labels, values);
    } else if (chartType === 'line') {
        drawLineChart(ctx, canvas, title, labels, values);
    } else if (chartType === 'pie' || chartType === 'doughnut') {
        drawPieChart(ctx, canvas, title, labels, values, chartType === 'doughnut');
    }
}

function drawBarChart(ctx, canvas, title, labels, values) {
    const padding = 60;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding - 40;
    const barWidth = chartWidth / labels.length - 10;
    const maxValue = Math.max(...values);
    
    // Draw title
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 30);
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw bars
    values.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + index * (chartWidth / labels.length) + 10;
        const y = canvas.height - padding - barHeight;
        
        // Draw bar
        const gradient = ctx.createLinearGradient(x, y, x, canvas.height - padding);
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
        gradient.addColorStop(1, 'rgba(118, 75, 162, 0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw border
        ctx.strokeStyle = 'rgba(102, 126, 234, 1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Draw label
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], x + barWidth / 2, canvas.height - padding + 20);
        
        // Draw value
        ctx.fillText(value, x + barWidth / 2, y - 5);
    });
    
    // Draw Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = (maxValue / 5) * i;
        const y = canvas.height - padding - (chartHeight / 5) * i;
        ctx.fillText(Math.round(value), padding - 10, y + 5);
    }
}

function drawLineChart(ctx, canvas, title, labels, values) {
    const padding = 60;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding - 40;
    const maxValue = Math.max(...values);
    
    // Draw title
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 30);
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw line
    ctx.strokeStyle = 'rgba(102, 126, 234, 1)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    // Handle single point case
    if (values.length === 1) {
        const x = padding + chartWidth / 2;
        const y = canvas.height - padding - (values[0] / maxValue) * chartHeight;
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(102, 126, 234, 1)';
        ctx.fill();
    } else {
        values.forEach((value, index) => {
            const x = padding + (index / (values.length - 1)) * chartWidth;
            const y = canvas.height - padding - (value / maxValue) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
    }
    
    // Draw points and labels
    values.forEach((value, index) => {
        const x = values.length === 1 ? padding + chartWidth / 2 : padding + (index / (values.length - 1)) * chartWidth;
        const y = canvas.height - padding - (value / maxValue) * chartHeight;
        
        // Draw point
        ctx.fillStyle = 'rgba(102, 126, 234, 1)';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw label
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], x, canvas.height - padding + 20);
        
        // Draw value
        ctx.fillText(value, x, y - 10);
    });
    
    // Draw Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = (maxValue / 5) * i;
        const y = canvas.height - padding - (chartHeight / 5) * i;
        ctx.fillText(Math.round(value), padding - 10, y + 5);
    }
}

function drawPieChart(ctx, canvas, title, labels, values, isDoughnut) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 20;
    const radius = Math.min(canvas.width, canvas.height) / 3;
    const total = values.reduce((sum, val) => sum + val, 0);
    
    // Draw title
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 30);
    
    const colors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)'
    ];
    
    let currentAngle = -Math.PI / 2;
    
    values.forEach((value, index) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        
        // Draw slice
        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw label
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], labelX, labelY);
        
        currentAngle += sliceAngle;
    });
    
    // Draw center circle for doughnut
    if (isDoughnut) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // Draw legend
    const legendX = 20;
    let legendY = canvas.height - 100;
    
    labels.forEach((label, index) => {
        // Draw color box
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(legendX, legendY, 15, 15);
        
        // Draw label
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${label}: ${values[index]}`, legendX + 20, legendY + 12);
        
        legendY += 20;
    });
}

function updateChart() {
    // Validate inputs
    const values = document.getElementById('dataValues').value.split(',').map(v => v.trim());
    const labels = document.getElementById('dataLabels').value.split(',').map(l => l.trim());
    
    if (values.length !== labels.length) {
        alert('Number of labels must match number of values!');
        return;
    }
    
    if (values.some(v => isNaN(parseFloat(v)))) {
        alert('All values must be valid numbers!');
        return;
    }
    
    createChart();
}

function resetChart() {
    document.getElementById('chartType').value = defaultConfig.chartType;
    document.getElementById('chartTitle').value = defaultConfig.chartTitle;
    document.getElementById('dataLabels').value = defaultConfig.dataLabels;
    document.getElementById('dataValues').value = defaultConfig.dataValues;
    document.getElementById('datasetLabel').value = defaultConfig.datasetLabel;
    
    createChart();
}
