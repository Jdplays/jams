import { getEvent, getNextEvent, getVolunteerStreak } from "@global/endpoints";
import { StreadData } from "@global/endpoints_interfaces";

let widget:HTMLDivElement = null
let streakData:StreadData = null

async function populateStreakWidget() {
    const streakGoodIcon = widget.querySelector('#streak-good-icon') as HTMLDivElement
    const streakBadIcon = widget.querySelector('#streak-bad-icon') as HTMLDivElement
    const streakCount = widget.querySelector('#streak-count') as HTMLDivElement
    const freezeCount = widget.querySelector('#freeze-count') as HTMLElement
    const freezeWord = widget.querySelector('#freeze-word') as HTMLSpanElement

    const response = await getVolunteerStreak()
    streakData = response.data

    if (streakData.streak > 0) {
        streakBadIcon.style.display = 'none'
        streakGoodIcon.style.display = 'block'
        streakCount.classList.remove('streak-number-bad')
        streakCount.classList.add('streak-number-good')
    } else {
        streakBadIcon.style.display = 'block'
        streakGoodIcon.style.display = 'none'
        streakCount.classList.add('streak-number-bad')
        streakCount.classList.remove('streak-number-good')
    }

    streakCount.innerHTML = String(streakData.streak)
    freezeCount.innerHTML = String(streakData.freezes)

    if (streakData.freezes === 1) {
        freezeWord.innerHTML = 'freeze'
    } else {
        freezeWord.innerHTML = 'freezes'
    }
}

function timeUntil(targetDateISO: string): string {
    const currentDate = new Date()
    const targetDate = new Date(targetDateISO)

    let delta = Math.max(0, targetDate.getTime() - currentDate.getTime())

    const seconds = Math.floor((delta / 1000) % 60)
    const minutes = Math.floor((delta / (1000 * 60)) % 60)
    const hours = Math.floor((delta / (1000 * 60 * 60)) % 24)
    const days = Math.floor((delta / (1000 * 60 * 60 * 24)) % 30)
    const months = Math.floor(delta / (1000 * 60 * 60 * 24 * 30))

    const parts = [];
    if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`)
    if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`)
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`)
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`)
    if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? "s" : ""}`)

    if (parts.length === 0) {
        return "The target date is now or has passed."
    } else if (parts.length === 1) {
        return parts[0]
    } else {
        return parts.slice(0, -1).join(", ") + " and " + parts.slice(-1)
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", async function () {
    widget = document.getElementById('streak-widget') as HTMLDivElement
    const timeUntilText = widget.querySelector('#time-until') as HTMLParagraphElement

    await populateStreakWidget()

    const nextEventIdResponse = await getNextEvent()
    const nextEventId = nextEventIdResponse.data

    const event = await getEvent(nextEventId)
    
    const currentDate = new Date(event.date)
    const nextStreakUpdateDate = new Date(currentDate)
    nextStreakUpdateDate.setUTCDate(currentDate.getUTCDate() + 1)

    window.setInterval(() => {
        const timeUntilString = timeUntil(nextStreakUpdateDate.toISOString())
        timeUntilText.innerHTML = `Next Update in: ${timeUntilString}`
    })
});