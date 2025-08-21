function diffMinutes(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const parseTime = (t) => {
        const [hm, period] = t.split(' ');
        if (!hm || !period) return null;
        const [h, m] = hm.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return null;
        let hour = h;
        if (period.toUpperCase() === 'PM' && h !== 12) hour += 12;
        if (period.toUpperCase() === 'AM' && h === 12) hour = 0;
        return hour * 60 + m;
    };
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    if (start === null || end === null) return 0;
    return end - start;
}

document.getElementById("addRiderBtn").addEventListener("click", () => {
    const riderDiv = document.createElement("div");
    riderDiv.classList.add("rider", "border", "rounded", "p-3", "mb-3", "bg-white", "shadow-sm");

    riderDiv.innerHTML = `  
        <div class="d-flex justify-content-between align-items-center mb-2">  
            <h6 class="mb-0">Rider ${document.querySelectorAll('.rider').length + 1}</h6>  
            <button type="button" class="btn btn-sm btn-danger remove-rider">Delete</button>  
        </div>  
        <div class="row g-2">  
            <div class="col-md-4"><label>Queued Time:<input type="text" placeholder="0:00 AM/PM" class="form-control queued"></label></div>
            <div class="col-md-4"><label>Accepted Time:<input type="text" placeholder="0:00 AM/PM" class="form-control accepted"></label></div>
            <div class="col-md-4"><label>Committed Pickup Time:<input type="text" placeholder="0:00 AM/PM" class="form-control committed"></label></div>
            <div class="col-md-4"><label>Near Pickup Time:<input type="text" placeholder="0:00 AM/PM" class="form-control nearpickup"></label></div>
            <div class="col-md-4"><label>Picked Up Time:<input type="text" placeholder="0:00 AM/PM" class="form-control pickedup"></label></div>
            <div class="col-md-4"><label>Est. Dropoff Departure:<input type="text" placeholder="0:00 AM/PM" class="form-control dropoff"></label></div>
        </div>  
    `;  

    const vertical = document.getElementById("vertical").value;  
    const ridersContainer = document.getElementById("ridersContainer");  
    ridersContainer.appendChild(riderDiv);  

    // Scheduled Time للسائق الأول NFV فقط
    const riders = document.querySelectorAll(".rider");  
    if (vertical === "NFV" && riders.length === 1 && !riderDiv.querySelector(".scheduled")) {  
        const scheduledInput = document.createElement("div");  
        scheduledInput.classList.add("mt-2");  
        scheduledInput.innerHTML = `<label>Scheduled Time:<input class="form-control scheduled" type="text" placeholder="0:00 AM/PM"></label>`;  
        riderDiv.insertBefore(scheduledInput, riderDiv.firstChild);  
    }  

    riderDiv.querySelector(".remove-rider").addEventListener("click", () => {  
        riderDiv.remove();  
    });
});

document.getElementById("calculateBtn").addEventListener("click", () => {
    const vertical = document.getElementById("vertical").value;
    const riders = document.querySelectorAll(".rider");
    const currentTimeInput = document.getElementById("currentTime").value;

    let groupedDelays = { "Dispatching Delay": 0, "Rider Delay": 0, "Preparation Delay": 0 };
    let timelineHTML = "Timeline:<br>";
    let firstRiderIssue = false;

    riders.forEach((rider, index) => { 
        const queued = rider.querySelector(".queued")?.value;
        const accepted = rider.querySelector(".accepted")?.value;
        const committed = rider.querySelector(".committed")?.value;
        const nearpickup = rider.querySelector(".nearpickup")?.value;
        const pickedup = rider.querySelector(".pickedup")?.value;
        const dropoff = rider.querySelector(".dropoff")?.value;
        let scheduled = vertical === "NFV" && index === 0 ? rider.querySelector(".scheduled")?.value : null;

        timelineHTML += `<b>Rider ${index + 1}:</b> `;
        if (scheduled) timelineHTML += `Scheduled: ${scheduled} | `;
        if (queued) timelineHTML += `Queued: ${queued} | `;
        if (accepted) timelineHTML += `Accepted: ${accepted} | `;
        if (committed) timelineHTML += `Committed Pickup: ${committed} | `;
        if (nearpickup) timelineHTML += `Near Pickup: ${nearpickup} | `;
        if (pickedup) timelineHTML += `Picked Up: ${pickedup} | `;
        if (dropoff) timelineHTML += `Est. Dropoff Departure: ${dropoff} | `;

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
        let riderDelay = 0, prepDelay = 0;
        if (committed) {
            if (nearpickup) {
                let delta = diffMinutes(committed, nearpickup);
                if (delta > 0) {
                    riderDelay = delta; // Rider arrived late → Rider Delay
                } else {
                    // Rider arrived early → Preparation Delay
                    if (pickedup) {
                        prepDelay = diffMinutes(committed, pickedup);
                    } else if (currentTimeInput) {
                        prepDelay = diffMinutes(committed, currentTimeInput);
                    }
                }
            } else if (pickedup) {
                prepDelay = diffMinutes(committed, pickedup);
            } else if (!pickedup && currentTimeInput) {
                prepDelay = diffMinutes(committed, currentTimeInput);
            }
        }

        // Rider ongoing delay from Picked Up → Current Time (حتى لو فيه Dropoff)
        if (pickedup && currentTimeInput) {
            let ongoingDelay = diffMinutes(pickedup, currentTimeInput);
            if (ongoingDelay > 0) {
                riderDelay += ongoingDelay; // نجمعه مع Rider Delay الأصلي
            }
        }

        groupedDelays["Rider Delay"] += riderDelay;

        // نحسب Preparation Delay فقط للرايدر الأول
        if (index === 0) {
            groupedDelays["Preparation Delay"] += prepDelay;
        }

        if (riderDelay > 0) timelineHTML += `<span style="color:red;">Rider Delay: ${riderDelay} mins</span> | `;
        if (prepDelay > 0 && index === 0) timelineHTML += `<span style="color:orange;">Preparation Delay: ${prepDelay} mins</span> | `;

        // Driving Time
        if (dropoff && pickedup) {
            let driving = diffMinutes(pickedup, dropoff);
            if (driving >= 0) timelineHTML += `<span>Driving Time: ${driving} mins</span> | `;
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
                    timelineHTML += `<span style="color:red;">Extra Rider Delay before second rider: ${extraDelay} mins</span> | `;
                }
            }
        }

        if (index === 0 && ((accepted && !pickedup) || (queued && !accepted))) {
            firstRiderIssue = true;
            timelineHTML += `<span style="color:red;"><b>Issue detected with Rider 1</b></span> | `;
        }

        timelineHTML += `<br>`;
    });

    const delayMapping = { "Dispatching Delay": "Lack of Delivery Men", "Rider Delay": "Late Delivery", "Preparation Delay": "Preparation Delay" };

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
            resultHTML += `<b>${delayMapping[type]}:</b> ${groupedDelays[type]} mins<br>`;
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
    } else {
        cancellationReason = delayMapping[biggestDelayType] || "Preparation Delay";
    }

    resultHTML += `<b>Cancellation Reason:</b> ${cancellationReason}<br>`;
    document.getElementById("result").innerHTML = resultHTML;
});