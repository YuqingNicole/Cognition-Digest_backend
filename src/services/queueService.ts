import Queue from "bull";
import { sendDigestEmail } from "./emailService.js";
import { prisma } from "../lib/db.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create email queue
export const emailQueue = new Queue("email-delivery", REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});

// Create report processing queue
export const reportQueue = new Queue("report-processing", REDIS_URL, {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Email queue processor
emailQueue.process(async (job) => {
  const { reportId, email, data } = job.data;

  console.log(`Processing email job for report ${reportId}`);

  try {
    const result = await sendDigestEmail(email, data);

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    // Update delivery status in database
    await prisma.report.update({
      where: { reportId },
      data: { deliveryStatus: "sent" },
    });

    console.log(`Email sent successfully for report ${reportId}`);
    return { success: true, reportId };
  } catch (error: any) {
    console.error(`Email delivery failed for report ${reportId}:`, error);

    // Update delivery status to failed
    await prisma.report.update({
      where: { reportId },
      data: { deliveryStatus: "failed" },
    });

    throw error; // Re-throw for Bull to handle retries
  }
});

// Report processing queue processor
reportQueue.process(async (job) => {
  const { reportId } = job.data;

  console.log(`Processing report ${reportId}`);

  try {
    // TODO: Replace with actual video processing logic
    // For now, simulate processing with mock data
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockSummary = {
      title: "AI Agent Revolution - Cognitive Era",
      key_points: [
        "LLMs are redefining reasoning",
        "Agents are the next paradigm",
        "Cognitive architectures enable complex workflows",
      ],
      word_count: 523,
      full_text: "This is a placeholder for the full summary text...",
    };

    // Update report with summary
    const report = await prisma.report.update({
      where: { reportId },
      data: {
        status: "completed",
        summaryTitle: mockSummary.title,
        summaryPoints: mockSummary.key_points,
        wordCount: mockSummary.word_count,
        fullText: mockSummary.full_text,
        completedAt: new Date(),
      },
    });

    // If delivery method is email, queue email job
    if (report.deliveryMethod === "email" && report.deliveryAddress) {
      await emailQueue.add({
        reportId: report.reportId,
        email: report.deliveryAddress,
        data: {
          title: mockSummary.title,
          key_points: mockSummary.key_points,
          word_count: mockSummary.word_count,
          full_text: mockSummary.full_text,
          source: report.source,
          video_id: report.videoId,
          channel_id: report.channelId,
          url: report.url,
          language: report.language,
          report_id: report.reportId,
        },
      });
    } else if (report.deliveryMethod === "webhook" && report.deliveryAddress) {
      // TODO: Implement webhook delivery
      await prisma.report.update({
        where: { reportId },
        data: { deliveryStatus: "queued" },
      });
    } else {
      await prisma.report.update({
        where: { reportId },
        data: { deliveryStatus: "none" },
      });
    }

    console.log(`Report ${reportId} processed successfully`);
    return { success: true, reportId };
  } catch (error: any) {
    console.error(`Report processing failed for ${reportId}:`, error);

    // Mark report as failed
    await prisma.report.update({
      where: { reportId },
      data: { status: "failed" },
    });

    throw error;
  }
});

// Queue event listeners
emailQueue.on("completed", (job, result) => {
  console.log(`Email job ${job.id} completed:`, result);
});

emailQueue.on("failed", (job, err) => {
  console.error(`Email job ${job?.id} failed:`, err.message);
});

reportQueue.on("completed", (job, result) => {
  console.log(`Report job ${job.id} completed:`, result);
});

reportQueue.on("failed", (job, err) => {
  console.error(`Report job ${job?.id} failed:`, err.message);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Closing queues...");
  await emailQueue.close();
  await reportQueue.close();
});
