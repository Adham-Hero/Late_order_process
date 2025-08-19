function diffMinutes(start, end) {
    const [startH, startM, startP] = parseTime(start);
    const [endH, endM, endP] = parseTime(end);
    let startTotal = startH * 60 + startM + (startP === "PM" && startH !== 12 ? 720 : 0);
    let endTotal = endH * 60 + endM + (endP === "PM" && endH !== 12 ? 720 : 0);
    return endTotal - startTotal;
}

function parseTime(timeStr) {
    if (!timeStr) return [0, 0, "AM"];
    let [time, period] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (hours === 12) hours = 0; // handle 12 AM/PM
    return [hours, minutes, period];
}

document.getElementById("calculateBtn").addEventListener("click", () => {
    const vertical = document.getElementById("vertical").value;
    const riders = document.querySelectorAll(".rider");
    const currentTimeInput = document.getElementById("currentTime").value;
    const riderReachable = document.getElementById("riderReachable").value;

    let groupedDelays = {
        "Dispatching Delay": 0,
        "Rider Delay": 0,
        "Preparation Delay": 0
    };

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

            if (vertical === "NFV" && scheduled) {
                let prepTime = diffMinutes(scheduled, queued);
                if (prepTime > 0) groupedDelays["Preparation Delay"] += prepTime;
            }
        }

        // Preparation & Rider Delay
        let preparationDelay = 0;
        let riderDelay = 0;

        if (nearpickup && committed) {
            if (diffMinutes(nearpickup, committed) < 0) {
                if (pickedup && diffMinutes(committed, pickedup) > 0) {
                    preparationDelay = diffMinutes(committed, pickedup);
                    groupedDelays["Preparation Delay"] += preparationDelay;
                }
            } else {
                riderDelay = diffMinutes(committed, nearpickup);
                if (riderDelay > 0) groupedDelays["Rider Delay"] += riderDelay;

                if (pickedup && diffMinutes(nearpickup, pickedup) > 0) {
                    preparationDelay = diffMinutes(nearpickup, pickedup);
                    groupedDelays["Preparation Delay"] += preparationDelay;
                }
            }
        } else if (committed && pickedup && diffMinutes(committed, pickedup) > 0) {
            preparationDelay = diffMinutes(committed, pickedup);
            groupedDelays["Preparation Delay"] += preparationDelay;
        }

        if (preparationDelay > 0) timelineHTML += `<em>Preparation Delay: ${preparationDelay} mins</em><br>`;
        if (riderDelay > 0) timelineHTML += `<em>Rider Delay: ${riderDelay} mins</em><br>`;

        // Rider Delay vs current time
        if (pickedup && currentTimeInput) {
            let currentDelay = diffMinutes(pickedup, currentTimeInput);
            if (currentDelay > 0) groupedDelays["Rider Delay"] += currentDelay;
        }

        if (index === 0 && ((accepted && !pickedup) || (queued && !accepted))) {
            firstRiderIssue = true;
        }

        timelineHTML += `</div>`;
    });

    const delayMapping = {
        "Dispatching Delay": "Lack of Delivery Men",
        "Rider Delay": "Late Delivery",
        "Preparation Delay": "Preparation Delay"
    };

    // تحديد أكبر تأخير
    let biggestDelayType = "";
    let biggestDelayValue = 0;
    Object.keys(groupedDelays).forEach(type => {
        if (groupedDelays[type] > biggestDelayValue) {
            biggestDelayValue = groupedDelays[type];
            biggestDelayType = type;
        }
    });

    // تحديد سبب الإلغاء
    let firstRiderCausedBiggestDelay = (biggestDelayType === "Rider Delay") && firstRiderIssue;

    let cancellationReason = "";
    if (riderReachable === "no" && biggestDelayType === "Rider Delay") {
        cancellationReason = "Rider Unreachable";
    } else if (hasMultipleRiders && biggestDelayType === "Rider Delay" && firstRiderCausedBiggestDelay) {
        cancellationReason = "Order picked up/delivered by another rider";
    } else {
        cancellationReason = delayMapping[biggestDelayType] || "Preparation Delay";
    }

    // النتيجة
    let resultHTML = timelineHTML + `<h5>Summary:</h5>`;
    Object.keys(groupedDelays).forEach(type => {
        if (groupedDelays[type] > 0) {
            resultHTML += `<p style="${biggestDelayType === type ? 'color:red; font-weight:bold;' : ''}">
                ${delayMapping[type]}: ${groupedDelays[type]} mins
            </p>`;
        }
    });

    resultHTML += `<p><strong>Biggest Delay:</strong> ${delayMapping[biggestDelayType]} = ${biggestDelayValue} mins</p>`;
    resultHTML += `<p><strong>Cancellation Reason:</strong> ${cancellationReason}</p>`;

    document.getElementById("result").innerHTML = resultHTML;
});