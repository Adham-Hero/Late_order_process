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

// إضافة رايدر جديد
document.getElementById("addRiderBtn").addEventListener("click", () => {
    const riderDiv = document.createElement("div");
    riderDiv.classList.add("rider", "border", "rounded", "p-3", "mb-2");

    riderDiv.innerHTML = `
        <label>Queued Time: <input type="text" placeholder="0:00 AM/PM" class="form-control queued"></label>
        <label>Accepted Time: <input type="text" placeholder="0:00 AM/PM" class="form-control accepted"></label>
        <label>Committed Pickup Time: <input type="text" placeholder="0:00 AM/PM" class="form-control committed"></label>
        <label>Near Pickup Time: <input type="text" placeholder="0:00 AM/PM" class="form-control nearpickup"></label>
        <label>Picked Up Time: <input type="text" placeholder="0:00 AM/PM" class="form-control pickedup"></label>
        <label>Est. Dropoff Departure: <input type="text" placeholder="0:00 AM/PM Estimated dropoff" class="form-control dropoff"></label>
    `;

    const vertical = document.getElementById("vertical").value;
    const ridersContainer = document.getElementById("ridersContainer");
    ridersContainer.appendChild(riderDiv);

    const riders = document.querySelectorAll(".rider");

    if (vertical === "NFV" && riders.length === 1 && !riderDiv.querySelector(".scheduled")) {
        const scheduledInput = document.createElement("label");
        scheduledInput.innerHTML = `Scheduled Time: <input type="text" placeholder="0:00 AM/PM" class="form-control scheduled">`;
        riderDiv.insertBefore(scheduledInput, riderDiv.firstChild);
    }
});

// حساب التأخيرات وعرض النتائج
document.getElementById("calculateBtn").addEventListener("click", () => {
    const vertical = document.getElementById("vertical").value;
    const riders = document.querySelectorAll(".rider");
    const currentTimeInput = document.getElementById("currentTime").value;
    const riderReachable = document.getElementById("riderReachable").value;

    let groupedDelays = { "Dispatching Delay": 0, "Rider Delay": 0, "Preparation Delay": 0 };
    let timelineHTML = "<h5>Timeline:</h5>";
    let firstRiderIssue = false;
    let hasMultipleRiders = riders.length > 1;

    riders.forEach((rider, index) => {
        const queued = rider.querySelector(".queued")?.value;
        const accepted = rider.querySelector(".accepted")?.value;
        const committed = rider.querySelector(".committed")?.value;
        const nearpickup = rider.querySelector(".nearpickup")?.value;
        const pickedup = rider.querySelector(".pickedup")?.value;
        const dropoff = rider.querySelector(".dropoff")?.value;
        let scheduled = vertical === "NFV" && index === 0 ? rider.querySelector(".scheduled")?.value : null;

        timelineHTML += `<div class="border rounded p-2 mb-2"><strong>Rider ${index + 1}:</strong><br>`;
        if (scheduled) timelineHTML += `Scheduled: ${scheduled}<br>`;
        if (queued) timelineHTML += `Queued: ${queued}<br>`;
        if (accepted) timelineHTML += `Accepted: ${accepted}<br>`;
        if (committed) timelineHTML += `Committed Pickup: ${committed}<br>`;
        if (nearpickup) timelineHTML += `Near Pickup: ${nearpickup}<br>`;
        if (pickedup) timelineHTML += `Picked Up: ${pickedup}<br>`;
        if (dropoff) timelineHTML += `Est. Dropoff Departure: ${dropoff}<br>`;

        // Dispatching Delay
        if (queued && accepted) {
            let dispatchTime = diffMinutes(queued, accepted);
            groupedDelays["Dispatching Delay"] += dispatchTime;

            // Preparation Delay حسب KB
            if (vertical === "NFV" && scheduled) {
                let prepTime = diffMinutes(scheduled, queued);
                if (prepTime > 0) groupedDelays["Preparation Delay"] += prepTime;
            }
        }

        // Preparation Delay حسب Committed / Near Pickup
        let preparationDelay = 0;
        if (committed && pickedup && diffMinutes(committed, pickedup) > 0) {
            preparationDelay = diffMinutes(committed, pickedup);
            groupedDelays["Preparation Delay"] += preparationDelay;
        } else if (nearpickup && pickedup && diffMinutes(nearpickup, pickedup) > 0) {
            preparationDelay = diffMinutes(nearpickup, pickedup);
            groupedDelays["Preparation Delay"] += preparationDelay;
        }
        if (preparationDelay > 0) timelineHTML += `<em>Preparation Delay: ${preparationDelay} mins</em><br>`;

        // Rider Delay
        if (pickedup && currentTimeInput) {
            let currentDelay = diffMinutes(pickedup, currentTimeInput);
            if (currentDelay > 0) groupedDelays["Rider Delay"] += currentDelay;
        }

        // Driving Time
        if (dropoff && pickedup) {
            let driving = diffMinutes(pickedup, dropoff);
            if (driving >= 0) timelineHTML += `<em>Driving Time: ${driving} mins</em><br>`;
        }

        if (index === 0 && ((accepted && !pickedup) || (queued && !accepted))) {
            firstRiderIssue = true;
            timelineHTML += `<strong style="color:red;">Issue detected with Rider 1</strong><br>`;
        }

        timelineHTML += `</div>`;
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

    let resultHTML = timelineHTML + `<h5>Summary:</h5>`;
    Object.keys(groupedDelays).forEach(type => {
        if (groupedDelays[type] > 0) {
            resultHTML += `<p style="${biggestDelayType === type ? 'color:red; font-weight:bold;' : ''}">
                ${delayMapping[type]}: ${groupedDelays[type]} mins
            </p>`;
        }
    });

    if (biggestDelayType) {
        resultHTML += `<p><strong>Biggest Delay:</strong> ${delayMapping[biggestDelayType]} = ${biggestDelayValue} mins</p>`;
    }

    let cancellationReason = "";
    if (riderReachable === "no" && biggestDelayType === "Rider Delay") {
        cancellationReason = "Rider Unreachable";
    } else if (hasMultipleRiders && firstRiderIssue) {
        cancellationReason = "Order picked up/delivered by another rider";
    } else {
        cancellationReason = delayMapping[biggestDelayType] || "Preparation Delay";
    }

    resultHTML += `<p><strong>Cancellation Reason:</strong> ${cancellationReason}</p>`;
    document.getElementById("result").innerHTML = resultHTML;
});