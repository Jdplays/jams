import { getEventStats } from "@global/endpoints";
import { LiveEventStats, Event } from "@global/endpoints_interfaces";
import { EventDetails } from "@global/event_details";
import { createEventSelectionDropdown, emptyElement, eventDropdownItemText, formatDateToShort, isDefined, preLoadEventDetails, removeSpinnerFromElement } from "@global/helper";
import { CheckInTrendStat, WorkshopPopularityStat } from "@global/interfaces";
import { getLiveEventStats } from "@global/sse_endpoints";
import ApexCharts from "apexcharts";

let liveCheckinTrendChart:ApexCharts = null
let eventId:number = null
let latestEventId:number = null
let eventDetailsMap:Record<number, Partial<Event>> = {}

const checkinChartOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", height: 300, toolbar: {show:false} },
    series: [
        { name: "Check-ins", data: [] as { x: number, y: number }[], color: "#28a745" },  // Green
        { name: "Checkouts", data: [] as { x: number, y: number }[], color: "#dc3545" }  // Red
    ],
    xaxis: { type: "datetime", labels: { format: "HH:mm" } },
    yaxis: { title: { text: "Count" } },
    plotOptions: {
        bar: {
            columnWidth: "50%", // Adjusts bar width
        }
    }
}

const genderDistributionChartOptions: ApexCharts.ApexOptions = {
    series: [], // Initially empty
    chart: {
        type: 'pie',
        height: 100
    },
    labels: ['Female', 'Male', 'Other'],
    colors: ['#FF6384', '#36A2EB', '#FFCE56'],
    legend: {
        position: 'right'
    }
}

const ageCategories = ["5-", "6-10", "11-15", "15-18", "18+"]
const ageDistributionChartOptions: ApexCharts.ApexOptions = {
    series: [{
        name: "Attendees",
        data: new Array(ageCategories.length).fill(0)
    }],
    chart: {
        type: 'bar',
        height: 100,
        toolbar: {show:false} 
    },
    plotOptions: {
        bar: {
            horizontal: false,
            columnWidth: '50%'
        }
    },
    dataLabels: {
        enabled: false
    },
    xaxis: {
        categories: [] // Age ranges will be added dynamically
    },
    colors: ['#008FFB'],
    legend: {
        position: 'right'
    }
}

let workshopOverlapChartOptions:ApexCharts.ApexOptions = {
    series: [],
    chart: {
        type: 'heatmap',
        height: 300,
        background: 'transparent',
        toolbar: {show:false}
    },
    dataLabels: {
        enabled: true,
        formatter: function(val: number, opts) {
            const data = opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex];
    
            // Ensure the workshop exists
            if (!data.workshop) {
                return "No Workshop";
            }
    
            // Retrieve attendee count and capacity (fallback to 0 if missing)
            const attendees = data.workshop.attendees ?? 0;
            const capacity = data.workshop.capacity ?? 0;
            const occupancyText = capacity > 0 ? `(${attendees} / ${capacity})` : "(0 / 0)";
    
            // Format the label as "Workshop Name (attendee_count / capacity)"
            return `${data.workshop.name} ${occupancyText}`;
        },
        style: {
            colors: ['#000'], // Black text for readability
            fontSize: '10px'
        }
    },
    plotOptions: {
        heatmap: {
            colorScale: {
                ranges: [
                    { from: 0, to: 0.4, color: "#76cf79" }, // Green (Low Pull)
                    { from: 0.4, to: 0.8, color: "#d19e52" }, // Yellow (Medium Pull)
                    { from: 0.8, to: 1, color: "#bf4d43" } // Red (High Pull)
                ]
            }
        }
    },
    xaxis: {
        type: 'category',
        title: {
            text: 'Locations'
        }
    },
    yaxis: {
        title: {
            text: 'Timeslots'
        }
    }
}


function getColorClass(
    value: number, 
    thresholds: { red: number; orange: number; green: number } = { red: 0.5, orange: 0.75, green: 1 }
): string {
    if (value < thresholds.red) {
        return 'text-danger';
    } else if (value < thresholds.orange) {
        return 'text-warning';
    } else {
        return 'text-success';
    }
}


function getTimeFromTimestamp(timestamp: string): number {
    const [hours, minutes] = timestamp.split(":").map(Number)
    const now = new Date()
    now.setHours(hours, minutes, 0, 0)
    return now.getTime()
}

function updateLiveEventStats(data: LiveEventStats) {
    const checkInsContainer = document.getElementById('live-checked-in-attendees-container') as HTMLDivElement
    const retentionContainer = document.getElementById('live-attendee-retention-container') as HTMLDivElement

    // Check-ins
    emptyElement(checkInsContainer)
    const checkInPercentage = data.total_checked_in / data.total_registered
    const checkInsText = document.createElement('span')
    checkInsText.className = getColorClass(checkInPercentage)
    checkInsText.innerHTML = String(data.current_checked_in)
    checkInsContainer.appendChild(checkInsText)
    const checkInsDivider = document.createElement('span')
    checkInsDivider.innerHTML = '/'
    checkInsContainer.appendChild(checkInsDivider)
    const registeredText = document.createElement('span')
    registeredText.innerHTML = String(data.total_registered)
    checkInsContainer.appendChild(registeredText)

    // Retention
    const totalCheckedIn = data.total_checked_in
    const currentCheckedIn = data.current_checked_in

    const retention = Math.round((currentCheckedIn / totalCheckedIn) * 100)

    emptyElement(retentionContainer)
    const retentionText = document.createElement('span')
    retentionText.className = getColorClass(retention)
    retentionText.innerHTML = `${retention}%`
    retentionContainer.appendChild(retentionText)
    document.getElementById("live-total-checked-in-text")!.innerHTML = `(Total Check-ins: ${data.total_checked_in})`

    updateCheckinTrend(liveCheckinTrendChart, data.check_in_trend)
}

async function updatePostEventStats(data:LiveEventStats) {
    const averageLeaveTimeText = document.getElementById('post-avg-leave') as HTMLElement
    const averageDurationTimeText = document.getElementById('post-avg-duration') as HTMLElement
    const genderDistributionChartConatiner = document.getElementById('post-gender-dis') as HTMLDivElement
    const ageDistributionChartConatiner = document.getElementById('post-age-dis') as HTMLDivElement
    const checkInsContainer = document.getElementById('post-checked-in-attendees-conatiner') as HTMLDivElement
    const retentionContainer = document.getElementById('post-attendee-retention-container') as HTMLDivElement
    const checkInTrendChartContainer = document.getElementById('post-check-in-trend-chart') as HTMLDivElement
    const mostPopularWorkshopsContainer = document.getElementById('post-most-popular-workshops-container') as HTMLDivElement
    const mostDropoutsWorkshopsContainer = document.getElementById('post-most-dropout-workshops-container') as HTMLDivElement
    const workshopOverlapChartContainer = document.getElementById('post-workshop-overlap-chart') as HTMLDivElement

    const genderDistributionChart = new ApexCharts(genderDistributionChartConatiner, genderDistributionChartOptions);
    const ageDistributionChart = new ApexCharts(ageDistributionChartConatiner, ageDistributionChartOptions);
    const checkInTrendChart = new ApexCharts(checkInTrendChartContainer, checkinChartOptions);
    const workshopOverlapChart = new ApexCharts(workshopOverlapChartContainer, workshopOverlapChartOptions);

    getEventStats(data.event_id).then((response) => {
        $("#post-event-stats-data").slideDown();
        document.getElementById('post-event-stats-error').style.display = 'none'
        const eventStats = response.data

        // Times
        averageLeaveTimeText.className = ''
        averageLeaveTimeText.innerHTML = eventStats.average_leave_time.split(':').slice(0,2).join(':')
        averageDurationTimeText.className = ''
        averageDurationTimeText.innerHTML = eventStats.average_duration.split(':').slice(0,2).join(':')

        // Gender
        genderDistributionChartConatiner.className = ''
        if (eventStats.gender_distribution === null || eventStats.gender_distribution === undefined) {
            genderDistributionChartConatiner.innerHTML = 'No Data'
        } else {
            genderDistributionChart.render()
            genderDistributionChart.updateSeries([eventStats.gender_distribution.male, eventStats.gender_distribution.female, eventStats.gender_distribution.other])
        }

        // Age
        ageDistributionChartConatiner.className = ''
        if (eventStats.age_distribution === null || eventStats.age_distribution === undefined) {
            ageDistributionChartConatiner.innerHTML = 'No Data'
        } else {
            ageDistributionChart.render()
            const ageCounts = ageCategories.map(category => eventStats.age_distribution[category] || 0);

            ageDistributionChart.updateOptions({
                xaxis: {categories: ageCategories}
            })
            ageDistributionChart.updateSeries([{name: "Attendees", data: ageCounts}])
        }

        // Check-ins
        emptyElement(checkInsContainer)
        const checkInPercentage = eventStats.total_checked_in / eventStats.total_registered
        const checkInsText = document.createElement('span')
        checkInsText.className = getColorClass(checkInPercentage)
        checkInsText.innerHTML = String(eventStats.total_checked_in)
        checkInsContainer.appendChild(checkInsText)
        const checkInsDivider = document.createElement('span')
        checkInsDivider.innerHTML = '/'
        checkInsContainer.appendChild(checkInsDivider)
        const registeredText = document.createElement('span')
        registeredText.innerHTML = String(eventStats.total_registered)
        checkInsContainer.appendChild(registeredText)

        // Retention
        emptyElement(retentionContainer)
        if (eventStats.retention_rate === null || eventStats.retention_rate === undefined) {
            retentionContainer.innerHTML = 'No Data'
        } else {
            const retentionText = document.createElement('span')
            retentionText.className = getColorClass(eventStats.retention_rate)
            retentionText.innerHTML = `${eventStats.retention_rate * 100}%`
            retentionContainer.appendChild(retentionText)
        }

        // Check in Trends
        if (eventStats.check_in_trend === null || eventStats.check_in_trend === undefined) {
            checkInTrendChartContainer.innerHTML = 'No Data'
        } else {
            checkInTrendChart.render()
            updateCheckinTrend(checkInTrendChart, eventStats.check_in_trend)
        }

        // Popular Workshops
        emptyElement(mostPopularWorkshopsContainer)
        const sortedPopularWorkshops = eventStats.workshop_popularity.sort((a, b) => b.score - a.score).slice(0, 3)

        sortedPopularWorkshops.map((stat:WorkshopPopularityStat, index:number) => {
            const p = document.createElement('p')
            const number = document.createElement('span')
            number.innerHTML = `${index + 1}. `
            p.appendChild(number)

            const workshop = document.createElement('a')
            workshop.innerHTML = stat.name
            workshop.href = `/private/management/workshops/${stat.id}/edit`
            workshop.target = '_blank'
            p.appendChild(workshop)

            if (index === 0) {
                const icon = document.createElement('i')
                icon.classList.add('ti', 'ti-crown', 'text-yellow', 'ms-2')
                p.appendChild(icon)
            }

            mostPopularWorkshopsContainer.appendChild(p)
        })

        // Dropout Workshops
        emptyElement(mostDropoutsWorkshopsContainer)
        if (eventStats.dropout_workshops === null || eventStats.dropout_workshops === undefined) {
            mostDropoutsWorkshopsContainer.innerHTML = 'No Data'
        } else {
            const sortedDropoutWorkshops = eventStats.dropout_workshops.sort((a, b) => b.score - a.score).slice(0, 3)

            sortedDropoutWorkshops.map((stat:WorkshopPopularityStat, index:number) => {
                const p = document.createElement('p')
                const number = document.createElement('span')
                number.innerHTML = `${index + 1}. `
                p.appendChild(number)

                const workshop = document.createElement('a')
                workshop.innerHTML = stat.name
                workshop.href = `/private/management/workshops/${stat.id}/edit`
                workshop.target = '_blank'
                p.appendChild(workshop)

                mostDropoutsWorkshopsContainer.appendChild(p)
            })
        }

        // Workshop Overlap Chart
        const workshopOverlap = eventStats.workshop_overlap
        if (workshopOverlap === null || workshopOverlap === undefined) {
            workshopOverlapChartContainer.innerHTML = 'No Data'
        } else {
            workshopOverlapChart.render()

            // Extract timeslot and location mappings
            const timeslotLabels = workshopOverlap.timeslots
            const locationLabels = workshopOverlap.locations

            const timeslotKeys = Object.keys(timeslotLabels).map(Number).sort((a, b) => b - a) // Reverse order as heatmap shows from bottom up on X axis
            const locationKeys = Object.keys(locationLabels).map(Number).sort((a, b) => a - b)

            const heatmapData = timeslotKeys.map(timeslot => {
                return {
                    name: timeslotLabels[timeslot],
                    data: locationKeys.map(location => {
                        const workshop = workshopOverlap.workshops.find(w => w.timeslot === timeslot && w.location === location)
                        return {
                            x: locationLabels[location],
                            y: workshop ? workshop.normalised_score : 0,
                            workshop: workshop ? workshop : null
                        }
                    })
                }
            })

            workshopOverlapChart.updateSeries(heatmapData)
        }
        removeSpinnerFromElement(workshopOverlapChartContainer)
    }).catch((error) => {
        $("#post-event-stats-data").slideUp();
        document.getElementById('post-event-stats-error').style.display = 'block'
    })
    

    
}

function updateCheckinTrend(chart:ApexCharts, data:CheckInTrendStat[]) {
    if (!data.length) return

    // Convert timestamps to Date objects
    const parsedData = data.map(item => ({
        timestamp: getTimeFromTimestamp(item.timestamp),
        checkins: item.checkins,
        checkouts: item.checkouts
    }))

    // Determine earliest and latest timestamps
    const earliestTime = parsedData[0].timestamp
    const latestTime = parsedData[parsedData.length - 1].timestamp

    // Generate 5-minute interval time slots
    const intervalMs = 10 * 60 * 1000
    const timeBuckets = new Map<number, { checkins: number; checkouts: number }>()

    for (let time = earliestTime; time <= latestTime; time += intervalMs) {
        timeBuckets.set(time, {checkins: 0, checkouts: 0})
    }

    // Fill in actual data points
    parsedData.forEach(({ timestamp, checkins, checkouts }) => {
        const roundedTime = Math.floor(timestamp / intervalMs) * intervalMs
        timeBuckets.set(roundedTime, {checkins, checkouts})
    })

    // Convert Map back to array for ApexCharts
    const formattedCheckins = Array.from(timeBuckets.entries()).map(([x, val]) => ({ x, y: val.checkins }))
    const formattedCheckouts = Array.from(timeBuckets.entries()).map(([x, val]) => ({ x, y: val.checkouts }))

    // Update the chart
    chart.updateSeries([
        { name: "Check-ins", data: formattedCheckins },
        { name: "Checkouts", data: formattedCheckouts }
    ])
}

function eventSelectionDropdownOnClick(eId:number) {
    if (eventId === eId) {
        return
    }

    const newDropdownText = eventDropdownItemText(eventDetailsMap[eId])
    document.getElementById('select-event-dropdown-button').innerText = newDropdownText

    const eventTitle = document.getElementById('post-event-title') as HTMLElement
    eventTitle.innerHTML = eventDetailsMap[eId].name
    eventId = eId
    updatePostEventStats({mode: 'POST', event_id: eId})
}

function latestEventOnClick() {
    if (eventId === latestEventId) {
        return
    }

    eventSelectionDropdownOnClick(latestEventId)
}

document.addEventListener("DOMContentLoaded", async () => {
    liveCheckinTrendChart = new ApexCharts(document.querySelector("#live-checkin-trend-chart"), checkinChartOptions);
    liveCheckinTrendChart.render();
    
    eventDetailsMap = await preLoadEventDetails()

    const sse = getLiveEventStats()
    sse.onUpdate((data) => {
        emptyElement(document.getElementById('event-selection-dropdown'))
        eventId = data.event_id
        latestEventId = eventId

        if (data.mode === "LIVE") {
            // Hide post event stats and show live event stats with sliding animation
            $("#post-event-stats-block").slideUp();
            $("#live-event-stats-block").slideDown();
            updateLiveEventStats(data)
          } else if (data.mode === "POST") {
            // Hide live event stats and show post event stats with sliding animation
            $("#live-event-stats-block").slideUp();
            $("#post-event-stats-block").slideDown();
            updatePostEventStats(data)
          } else if(data.mode === 'ERROR') {
            $("#live-event-stats-block").slideUp();
            $("#post-event-stats-data").slideUp();
            $("#post-event-stats-block").slideDown();
            
            document.getElementById('post-event-stats-error').style.display = 'block'
          }

          if (data.mode === 'POST' || data.mode === 'ERROR') {
            eventSelectionDropdownOnClick(eventId)

            const eventSelectionDropdown = createEventSelectionDropdown(eventId, eventDetailsMap, eventSelectionDropdownOnClick)
            document.getElementById('event-selection-dropdown').appendChild(eventSelectionDropdown)
            document.getElementById('select-event-dropdown-button').classList.add('col-12')
          }
    })
});

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).latestEventOnClick = latestEventOnClick;
    }
});