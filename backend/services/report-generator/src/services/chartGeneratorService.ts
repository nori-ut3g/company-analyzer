import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';

export class ChartGeneratorService {
  private chartJSNodeCanvas: ChartJSNodeCanvas;
  
  constructor() {
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white'
    });
  }
  
  /**
   * Generate a line chart
   */
  async generateLineChart(
    data: { year: number; value: number }[],
    title: string,
    xLabel: string,
    yLabel: string
  ): Promise<string> {
    const configuration: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.map(d => d.year.toString()),
        datasets: [{
          label: title,
          data: data.map(d => d.value),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 16
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: xLabel
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: yLabel
            },
            beginAtZero: true
          }
        }
      }
    };
    
    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return imageBuffer.toString('base64');
  }
  
  /**
   * Generate a bar chart
   */
  async generateBarChart(
    data: { label: string; value: number }[],
    title: string,
    xLabel: string,
    yLabel: string
  ): Promise<string> {
    const configuration: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: title,
          data: data.map(d => d.value),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 205, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)'
          ],
          borderColor: [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 205, 86)',
            'rgb(75, 192, 192)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 16
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: xLabel
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: yLabel
            },
            beginAtZero: true
          }
        }
      }
    };
    
    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return imageBuffer.toString('base64');
  }
  
  /**
   * Generate a pie chart
   */
  async generatePieChart(
    data: { label: string; value: number }[],
    title: string
  ): Promise<string> {
    const configuration: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 205, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)'
          ],
          borderColor: [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 205, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 16
            }
          },
          legend: {
            display: true,
            position: 'right'
          }
        }
      }
    };
    
    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return imageBuffer.toString('base64');
  }
  
  /**
   * Generate a radar chart for multi-metric comparison
   */
  async generateRadarChart(
    data: { [metric: string]: number }[],
    labels: string[],
    title: string
  ): Promise<string> {
    const datasets = data.map((company, index) => ({
      label: labels[index],
      data: Object.values(company),
      fill: true,
      backgroundColor: `rgba(${54 + index * 50}, ${162 - index * 30}, ${235 - index * 40}, 0.2)`,
      borderColor: `rgb(${54 + index * 50}, ${162 - index * 30}, ${235 - index * 40})`,
      pointBackgroundColor: `rgb(${54 + index * 50}, ${162 - index * 30}, ${235 - index * 40})`,
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: `rgb(${54 + index * 50}, ${162 - index * 30}, ${235 - index * 40})`
    }));
    
    const configuration: ChartConfiguration = {
      type: 'radar',
      data: {
        labels: Object.keys(data[0]),
        datasets
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 16
            }
          }
        },
        scales: {
          r: {
            beginAtZero: true
          }
        }
      }
    };
    
    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return imageBuffer.toString('base64');
  }
}