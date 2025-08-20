function diffMinutes(startTime, endTime) {
    const today = new Date();
    if (!startTime || !endTime) return 0;
    const [startHourMin, startPeriod] = startTime.split(' ');
    const [endHourMin, endPeriod] = endTime.split(' ');
    let [startHour, startMin] = startHourMin.split(':').map(Number);
    let [endHour, endMin] = endHourMin.split(':').map(Number);
    if (startPeriod.toUpperCase() === 'PM' && startHour !== 12) startHour += 12;
    if (startPeriod.toUpperCase() === 'AM' && startHour === 12) startHour = 0;
    if (endPeriod.toUpperCase() === 'PM' && endHour !== 12) endHour += 12;
    if (endPeriod.toUpperCase() === 'AM' && endHour === 12) endHour = 0;
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin);
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMin);
    return Math.floor((endDate - startDate) / 60000);
}

document.getElementById("addRiderBtn").addEventListener("click", () => {
    const riderDiv = document.createElement("div");
    riderDiv.classList.add("rider", "border", "rounded", "p-3", "mb-2");
    riderDiv.innerHTML = `
        Queued Time: <input class="queued" type="text">
        Accepted Time: <input class="accepted" type="text">
        Committed Pickup Time: <input class="committed" type="text">
        Near Pickup Time: <input class="nearpickup" type="text">
        Picked Up Time: <input class="pickedup" type="text">
        Est. Dropoff Departure: <input class="dropoff" type="text">
    `;
    const vertical = document.getElementById("vertical").value;
    const ridersContainer = document.getElementById("ridersContainer");
    ridersContainer.appendChild(riderDiv);
    const riders = document.querySelectorAll(".rider");
    if (vertical === "NFV" && riders.length === 1 && !riderDiv.querySelector(".scheduled")) {
        const scheduledInput = document.createElement("label");
        scheduledInput.innerHTML = `Scheduled Time: <input class="scheduled" type="text">`;
        riderDiv.insertBefore(scheduledInput, riderDiv.firstChild);
    }
});

document.getElementById("calculateBtn").addEventListener("click", () => {
    const vertical = document.getElementById("vertical").value;
    const riders = document.querySelectorAll(".rider");
    const currentTimeInput = document.getElementById("currentTime").value;
    const riderReachable = document.getElementById("riderReachable").value;
    let groupedDelays = { "Dispatching Delay": 0, "Rider Delay": 0, "Preparation Delay": 0 };
    let timelineHTML = "<h5>Timeline:</h5>";
    let firstRiderIssue = false;

    riders.forEach((rider, index) => {
        const queued = rider.querySelector(".queued")?.value;
        const accepted = rider.querySelector(".accepted")?.value;
        const committed = rider.querySelector(".committed")?.value;
        const nearpickup = rider.querySelector(".nearpickup")?.value;
        const pickedup = rider.querySelector(".pickedup")?.value;
        const dropoff = rider.querySelector(".dropoff")?.value;
        let scheduled = vertical === "NFV" && index === 0 ? rider.querySelector(".scheduled")?.value : null;

        timelineHTML += `**Rider ${index + 1}:** `;
        if (scheduled) timelineHTML += `Scheduled: ${scheduled} `;
        if (queued) timelineHTML += `Queued: ${queued} `;
        if (accepted) timelineHTML += `Accepted: ${accepted} `;
        if (committed) timelineHTML += `Committed Pickup: ${committed} `;
        if (nearpickup) timelineHTML += `Near Pickup: ${nearpickup} `;
        if (pickedup) timelineHTML += `Picked Up: ${pickedup} `;
        if (dropoff) timelineHTML += `Est. Dropoff Departure: ${dropoff} `;

        // Dispatching Delay
        if (queued && accepted) {
            let dispatchTime = diffMinutes(queued, accepted);
            groupedDelays["Dispatching Delay"] += dispatchTime;
            if (vertical === "NFV" && scheduled) {
                let prepTime = diffMinutes(scheduled, queued);
                if (prepTime > 0) groupedDelays["Preparation Delay"] += prepTime;
            }
        }

        // Preparation Delay
        let preparationDelay = 0;
        if (nearpickup && committed) {
            if (diffMinutes(nearpickup, committed) < 0) {
                if (pickedup && diffMinutes(committed, pickedup) > 0) {
                    preparationDelay = diffMinutes(committed, pickedup);
                    groupedDelays["Preparation Delay"] += preparationDelay;
                }
            } else {
                if (pickedup && diffMinutes(nearpickup, pickedup) > 0) {
                    preparationDelay = diffMinutes(nearpickup, pickedup);
                    groupedDelays["Preparation Delay"] += preparationDelay;
                }
            }
        } else if (committed && pickedup && diffMinutes(committed, pickedup) > 0) {
            preparationDelay = diffMinutes(committed, pickedup);
            groupedDelays["Preparation Delay"] += preparationDelay;
        }

        if (preparationDelay > 0) timelineHTML += `*Preparation Delay: ${preparationDelay} mins* `;

        // Rider Delay
        if (pickedup && currentTimeInput) {
            let currentDelay = diffMinutes(pickedup, currentTimeInput);
            if (currentDelay > 0) groupedDelays["Rider Delay"] += currentDelay;
        }

        // Driving Time
        if (dropoff && pickedup) {
            let driving = diffMinutes(pickedup, dropoff);
            if (driving >= 0) timelineHTML += `*Driving Time: ${driving} mins* `;
        }

        // Extra Rider Delay بين السائق الأول والثاني
        if (riders.length > 1 && index === 0) {
            const nextRider = riders[1];
            const nextAssignedTime = nextRider.querySelector(".queued")?.value || nextRider.querySelector(".accepted")?.value;
            const lastTimeFirstRider = pickedup || nearpickup || committed || accepted || queued;
            if (lastTimeFirstRider && nextAssignedTime) {
                let extraDelay = diffMinutes(lastTimeFirstRider, nextAssignedTime);
                if (extraDelay > 0) {
                    groupedDelays["Rider Delay"] += extraDelay;
                    timelineHTML += `*Extra Rider Delay before second rider assigned: ${extraDelay} mins* `;
                }
            }
        }

        if (index === 0 && ((accepted && !pickedup) || (queued && !accepted))) {
            firstRiderIssue = true;
            timelineHTML += `**Issue detected with Rider 1** `;
        }

        timelineHTML += `\n`;
    });

    const delayMapping = {
        "Dispatching Delay": "Lack of Delivery Men",
        "Rider Delay": "Late Delivery",
        "Preparation Delay": "Preparation Delay"
    };

    let biggestDelayType = "";
    let biggestDelayValue = 0;
    Object.keys(groupedDelays).forEach(type => {
        if (groupedDelays[type] > biggestDelayValue) {
            biggestDelayValue = groupedDelays[type];
            biggestDelayType = type;
        }
    });

    let resultHTML = timelineHTML + `\n##### Summary:\n`;
    Object.keys(groupedDelays).forEach(type => {
        if (groupedDelays[type] > 0) {
            resultHTML += `\n${delayMapping[type]}: ${groupedDelays[type]} mins\n`;
        }
    });

    // تحديد سبب الإلغاء
    let cancellationReason = "";
    if (riders.length > 1) {
        if (firstRiderIssue) {
            cancellationReason = "Picked up by another rider";
        } else if (biggestDelayType === "Rider Delay") {
            cancellationReason = "Late Delivery";
        } else {
            cancellationReason = delayMapping[biggestDelayType] || "Preparation Delay";
        }
    } else { // سائق واحد
        cancellationReason = delayMapping[biggestDelayType] || "Preparation Delay";
    }

    resultHTML += `\n**Cancellation Reason:** ${cancellationReason}\n`;
    document.getElementById("result").innerHTML = resultHTML;
});