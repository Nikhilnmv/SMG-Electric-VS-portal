/**
 * Monitoring and Metrics Service
 * 
 * This module provides interfaces for exporting metrics to monitoring systems.
 * Currently provides placeholder implementations that can be replaced with:
 * - Prometheus metrics export
 * - AWS CloudWatch integration
 * - Google Cloud Monitoring integration
 * 
 * Usage:
 * 1. For Prometheus: Install 'prom-client' and use the PrometheusMetricCollector
 * 2. For AWS CloudWatch: Install '@aws-sdk/client-cloudwatch' and use CloudWatchMetrics
 * 3. For GCP Monitoring: Install '@google-cloud/monitoring' and use GCPMetrics
 */

// ============================================
// Prometheus Metrics Export (Placeholder)
// ============================================

/**
 * Prometheus metrics collector interface
 * 
 * To implement:
 * 1. Install: pnpm add prom-client
 * 2. Create PrometheusMetricCollector class implementing this interface
 * 3. Use prom-client's Registry, Counter, Histogram, Gauge types
 */
export interface PrometheusMetricCollector {
  /**
   * Export metrics in Prometheus format
   * Returns metrics in Prometheus text format
   */
  exportMetrics(): Promise<string>;

  /**
   * Record video transcoding duration
   */
  recordTranscodingDuration(videoId: string, durationSeconds: number, success: boolean): void;

  /**
   * Record worker job duration
   */
  recordWorkerJobDuration(jobType: string, durationSeconds: number, success: boolean): void;

  /**
   * Increment API request counter
   */
  incrementApiRequest(method: string, route: string, statusCode: number): void;

  /**
   * Record database query duration
   */
  recordDatabaseQuery(query: string, durationSeconds: number): void;

  /**
   * Set current active worker jobs gauge
   */
  setActiveWorkerJobs(count: number): void;

  /**
   * Set queue size gauge
   */
  setQueueSize(queueName: string, size: number): void;
}

/**
 * Placeholder Prometheus implementation
 * Replace with actual prom-client implementation
 */
export class PrometheusMetricCollectorImpl implements PrometheusMetricCollector {
  async exportMetrics(): Promise<string> {
    // TODO: Implement with prom-client
    // Example:
    // const register = new promClient.Registry();
    // return register.metrics();
    return '# Prometheus metrics endpoint\n# Install prom-client and implement this';
  }

  recordTranscodingDuration(videoId: string, durationSeconds: number, success: boolean): void {
    // TODO: Implement histogram metric
    console.log(`[Metrics] Transcoding duration: ${durationSeconds}s, success: ${success}`);
  }

  recordWorkerJobDuration(jobType: string, durationSeconds: number, success: boolean): void {
    // TODO: Implement histogram metric
    console.log(`[Metrics] Worker job duration: ${jobType}, ${durationSeconds}s, success: ${success}`);
  }

  incrementApiRequest(method: string, route: string, statusCode: number): void {
    // TODO: Implement counter metric
    console.log(`[Metrics] API request: ${method} ${route} ${statusCode}`);
  }

  recordDatabaseQuery(query: string, durationSeconds: number): void {
    // TODO: Implement histogram metric
    console.log(`[Metrics] Database query: ${query}, ${durationSeconds}s`);
  }

  setActiveWorkerJobs(count: number): void {
    // TODO: Implement gauge metric
    console.log(`[Metrics] Active worker jobs: ${count}`);
  }

  setQueueSize(queueName: string, size: number): void {
    // TODO: Implement gauge metric
    console.log(`[Metrics] Queue size: ${queueName}, ${size}`);
  }
}

// ============================================
// AWS CloudWatch Integration (Placeholder)
// ============================================

/**
 * AWS CloudWatch metrics interface
 * 
 * To implement:
 * 1. Install: pnpm add @aws-sdk/client-cloudwatch
 * 2. Create CloudWatchMetrics class implementing this interface
 * 3. Use CloudWatchClient and PutMetricDataCommand
 */
export interface CloudWatchMetrics {
  /**
   * Send custom metric to CloudWatch
   */
  putMetric(
    namespace: string,
    metricName: string,
    value: number,
    unit: 'Count' | 'Seconds' | 'Bytes' | 'Percent',
    dimensions?: Record<string, string>
  ): Promise<void>;

  /**
   * Record video transcoding time
   */
  recordTranscodingTime(videoId: string, durationSeconds: number, success: boolean): Promise<void>;

  /**
   * Record worker job duration
   */
  recordWorkerJobDuration(jobType: string, durationSeconds: number, success: boolean): Promise<void>;
}

/**
 * Placeholder CloudWatch implementation
 * Replace with actual AWS SDK implementation
 */
export class CloudWatchMetricsImpl implements CloudWatchMetrics {
  async putMetric(
    namespace: string,
    metricName: string,
    value: number,
    unit: 'Count' | 'Seconds' | 'Bytes' | 'Percent',
    dimensions?: Record<string, string>
  ): Promise<void> {
    // TODO: Implement with @aws-sdk/client-cloudwatch
    console.log(`[CloudWatch] ${namespace}.${metricName}: ${value} ${unit}`, dimensions);
  }

  async recordTranscodingTime(videoId: string, durationSeconds: number, success: boolean): Promise<void> {
    await this.putMetric(
      'VSPlatform/VideoProcessing',
      'TranscodingDuration',
      durationSeconds,
      'Seconds',
      { videoId, success: success.toString() }
    );
  }

  async recordWorkerJobDuration(jobType: string, durationSeconds: number, success: boolean): Promise<void> {
    await this.putMetric(
      'VSPlatform/Worker',
      'JobDuration',
      durationSeconds,
      'Seconds',
      { jobType, success: success.toString() }
    );
  }
}

// ============================================
// Google Cloud Monitoring Integration (Placeholder)
// ============================================

/**
 * Google Cloud Monitoring metrics interface
 * 
 * To implement:
 * 1. Install: pnpm add @google-cloud/monitoring
 * 2. Create GCPMetrics class implementing this interface
 * 3. Use MetricServiceClient and createTimeSeries
 */
export interface GCPMetrics {
  /**
   * Record video transcoding time
   */
  recordTranscodingTime(videoId: string, durationSeconds: number, success: boolean): Promise<void>;

  /**
   * Record worker job duration
   */
  recordWorkerJobDuration(jobType: string, durationSeconds: number, success: boolean): Promise<void>;
}

/**
 * Placeholder GCP implementation
 * Replace with actual @google-cloud/monitoring implementation
 */
export class GCPMetricsImpl implements GCPMetrics {
  async recordTranscodingTime(videoId: string, durationSeconds: number, success: boolean): Promise<void> {
    // TODO: Implement with @google-cloud/monitoring
    console.log(`[GCP Monitoring] Transcoding time: ${videoId}, ${durationSeconds}s, success: ${success}`);
  }

  async recordWorkerJobDuration(jobType: string, durationSeconds: number, success: boolean): Promise<void> {
    // TODO: Implement with @google-cloud/monitoring
    console.log(`[GCP Monitoring] Worker job: ${jobType}, ${durationSeconds}s, success: ${success}`);
  }
}

// ============================================
// Default Metrics Service (uses Prometheus placeholder)
// ============================================

/**
 * Default metrics service instance
 * Replace with your preferred monitoring solution
 */
export const metricsService = new PrometheusMetricCollectorImpl();

/**
 * Controller endpoint for Prometheus metrics scraping
 * 
 * Usage in Express:
 * app.get('/metrics', async (req, res) => {
 *   const metrics = await metricsService.exportMetrics();
 *   res.set('Content-Type', 'text/plain');
 *   res.send(metrics);
 * });
 */
export async function getMetricsEndpoint(): Promise<string> {
  return metricsService.exportMetrics();
}

