import { getExternalApiLogsMetadata, getPrivateAccessLogsMetadata, getTaskSchedulerLogsMetadata, getWebhookLogsMetadata } from "@global/endpoints";
import { roundNumber } from "@global/helper";

async function loadPrivateAccessLogData() {
    const privateAccessLogSize = document.getElementById('private-access-log-size')
    const response = await getPrivateAccessLogsMetadata()

    privateAccessLogSize.innerHTML = `${roundNumber(response.table_size)}MB`
}

async function loadTaskSchedulerLogData() {
    const taskSchedulerLogSize = document.getElementById('task-scheduler-log-size')
    const response = await getTaskSchedulerLogsMetadata()

    taskSchedulerLogSize.innerHTML = `${roundNumber(response.table_size)}MB`
}

async function loadWebhookLogData() {
    const webhookLogSize = document.getElementById('webhooks-log-size')
    const response = await getWebhookLogsMetadata()

    webhookLogSize.innerHTML = `${roundNumber(response.table_size)}MB`
}

async function loadExternalAPILogData() {
    const externalAPILogSize = document.getElementById('external-api-log-size')
    const response = await getExternalApiLogsMetadata()

    externalAPILogSize.innerHTML = `${roundNumber(response.table_size)}MB`
}

document.addEventListener("DOMContentLoaded", () => {
    loadPrivateAccessLogData()
    loadTaskSchedulerLogData()
    loadWebhookLogData()
    loadExternalAPILogData()
});