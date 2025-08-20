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
riderDiv.classList.add("rider", "border", "rounded", "p-3", "mb-3", "bg-white", "shadow-sm");

riderDiv.innerHTML = `  
    <div class="d-flex justify-content-between align-items-center mb-2">  
        <h6 class="mb-0">Rider ${document.querySelectorAll('.rider').length + 1}</h6>  
        <button type="button" class="btn btn-sm btn-danger remove-rider">Delete</button>  
    </div>  
    <div class="row g-2">  
        <div class="col-md-4">  
            <label>Queued Time:   
                <input type="text" placeholder="0:00 AM/PM" class="form-control queued">  
            </label>  
        </div>  
        <div class="col-md-4">  
            <label>Accepted Time:   
                <input type="text" placeholder="0:00 AM/PM" class="form-control accepted">  
            </label>  
        </div>  
        <div class="col-md-4">  
            <label>Committed Pickup Time:   
                <input type="text" placeholder="0:00 AM/PM" class="form-control committed">  
            </label>  
        </div>  
        <div class="col-md-4">  
            <label>Near Pickup Time:   
                <input type="text" placeholder="0:00 AM/PM" class="form-control nearpickup">  
            </label>  
        </div>  
        <div class="col-md-4">  
            <label>Picked Up Time:   
                <input type="text" placeholder="0:00 AM/PM" class="form-control pickedup">  
            </label>  
        </div>  
        <div class="col-md-4">  
            <label>Est. Dropoff Departure:   
                <input type="text" placeholder="0:00 AM/PM" class="form-control dropoff">  
            </label>  
        </div>  
    </div>  
`;  

const vertical = document.getElementById("vertical").value;  
const ridersContainer = document.getElementById("ridersContainer");  
ridersContainer.appendChild(riderDiv);  

// إضافة Scheduled Time للسائق الأول NFV فقط  
const riders = document.querySelectorAll(".rider");  
if (vertical === "NFV" && riders.length === 1 && !riderDiv.querySelector(".scheduled")) {  
    const scheduledInput = document.createElement("div");  
    scheduledInput.classList.add("mt-2");  
    scheduledInput.innerHTML = `  
        <label>Scheduled Time:   
            <input class="form-control scheduled" type="text" placeholder="0:00 AM/PM">  
        </label>  
    `;  
    riderDiv.insertBefore(scheduledInput, riderDiv.firstChild);  
}  

// حدث حذف السائق عند الضغط على زر Delete  
riderDiv.querySelector(".remove-rider").addEventListener("click", () => {  
    riderDiv.remove();  
});

});
document.getElementById("calculateBtn").addEventListener("click", () => {
    const vertical = document.getElementById("vertical").value;
    const riders = document.querySelectorAll(".rider");
    const currentTimeInput = document.getElementById("currentTime").value;

    let groupedDelays = { "Dispatching Delay": 0, "Rider Delay": 0, "Preparation Delay": 0 };
    let timelineHTML = `<h5>Timeline:</h5><table border="1" cellpadding="5" cellspacing="0">
                        <tr>
                            <th>Rider</th>
                            <th>Scheduled</th>
                            <th>Queued</th>
                            <th>Accepted</th>
                            <th>Committed</th>
                            <th>Near Pickup</th>
                            <th>Picked Up</th>
                            <th>Dropoff</th>
                            <th>Delays</th>
                        </tr>`;

    let firstRiderIssue = false;

    riders.forEach((rider, index) => {
        const queued = rider.querySelector(".queued")?.value;
        const accepted = rider.querySelector(".accepted")?.value;
        const committed = rider.querySelector(".committed")?.value;
        const nearpickup = rider.querySelector(".nearpickup")?.value;
        const pickedup = rider.querySelector(".pickedup")?.value;
        const dropoff = rider.querySelector(".dropoff")?.value;
        const scheduled = vertical === "NFV" && index === 0 ? rider.querySelector(".scheduled")?.value : null;

        let delaysHTML = "";
        let riderDelay = 0, prepDelay = 0;

        // Dispatching Delay
        if (queued && accepted) {
            let dispatchTime = diffMinutes(queued, accepted);
            groupedDelays["Dispatching Delay"] += dispatchTime;
            if (scheduled) {
                let prepTime = diffMinutes(scheduled, queued);
                if (prepTime > 0) groupedDelays["Preparation Delay"] += prepTime;
            }
        }

        // Rider & Preparation Delay logic محسّن
        if (committed) {
            if (nearpickup && diffMinutes(nearpickup, committed) > 0) {
                // السائق تأخر عن committed
                riderDelay = diffMinutes(committed, nearpickup);
            } else if (pickedup && diffMinutes(pickedup, committed) > 0) {
                // التأخير بسبب التحضير
                prepDelay = diffMinutes(committed, pickedup);
            } else if (!pickedup && currentTimeInput) {
                prepDelay = diffMinutes(committed, currentTimeInput);
            }
        }

        groupedDelays["Rider Delay"] += riderDelay;
        groupedDelays["Preparation Delay"] += prepDelay;

        if (riderDelay > 0) delaysHTML += `<span style="color:red;">Rider Delay: ${riderDelay} mins</span><br>`;
        if (prepDelay > 0) delaysHTML += `<span style="color:orange;">Preparation Delay: ${prepDelay} mins</span><br>`;

        // Extra Rider Delay بين السائق الأول والثاني
        if (riders.length > 1 && index === 0) {
            const nextRider = riders[1];
            const nextAssignedTime = nextRider.querySelector(".queued")?.value || nextRider.querySelector(".accepted")?.value;
            const lastTimeFirstRider = pickedup || nearpickup || committed || accepted || queued;
            if (lastTimeFirstRider && nextAssignedTime) {
                let extraDelay = diffMinutes(lastTimeFirstRider, nextAssignedTime);
                if (extraDelay > 0) {
                    groupedDelays["Rider Delay"] += extraDelay;
                    delaysHTML += `<span style="color:red;">Extra Rider Delay before second rider: ${extraDelay} mins</span><br>`;
                }
            }
        }

        if (index === 0 && ((accepted && !pickedup) || (queued && !accepted))) {
            firstRiderIssue = true;
            delaysHTML += `<span style="color:red;"><b>Issue detected with Rider 1</b></span><br>`;
        }

        // Driving Time
        let drivingHTML = "";
        if (dropoff && pickedup) {
            let driving = diffMinutes(pickedup, dropoff);
            if (driving >= 0) drivingHTML = `<span>Driving Time: ${driving} mins</span>`;
        }

        timelineHTML += `<tr>
            <td>${index + 1}</td>
            <td>${scheduled || ""}</td>
            <td>${queued || ""}</td>
            <td>${accepted || ""}</td>
            <td>${committed || ""}</td>
            <td>${nearpickup || ""}</td>
            <td>${pickedup || ""}</td>
            <td>${dropoff || ""}</td>
            <td>${delaysHTML}${drivingHTML}</td>
        </tr>`;
    });

    timelineHTML += `</table>`;

    // الملخص واختيار سبب الإلغاء
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
            resultHTML += `<b>${delayMapping[type]}:</b> ${groupedDelays[type]} mins<br>`;
        }
    });

    let cancellationReason = "";
    if (riders.length > 1) {
        if (firstRiderIssue) cancellationReason = "Picked up by another rider";
        else if (biggestDelayType === "Rider Delay") cancellationReason = "Late Delivery";
        else cancellationReason = delayMapping[biggestDelayType] || "Preparation Delay";
    } else {
        cancellationReason = delayMapping[biggestDelayType] || "Preparation Delay";
    }

    resultHTML += `<b>Cancellation Reason:</b> ${cancellationReason}<br>`;
    document.getElementById("result").innerHTML = resultHTML;
});