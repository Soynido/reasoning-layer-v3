import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    component?: string;
    metadata?: any;
}

export class Logger {
    private outputChannel: vscode.OutputChannel;
    private workspaceRoot: string;
    private logsDir: string;
    private currentLogFile: string;
    private minLevel: LogLevel;

    constructor(workspaceRoot: string, outputChannelName: string = 'Reasoning Layer V3', minLevel: LogLevel = LogLevel.INFO) {
        this.workspaceRoot = workspaceRoot;
        this.outputChannel = vscode.window.createOutputChannel(outputChannelName);
        this.minLevel = minLevel;

        // Setup logs directory
        const reasoningDir = path.join(workspaceRoot, '.reasoning');
        this.logsDir = path.join(reasoningDir, 'logs');

        // Ensure logs directory exists
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }

        // Current log file
        const today = new Date().toISOString().split('T')[0];
        this.currentLogFile = path.join(this.logsDir, `${today}.log`);
    }

    private formatTimestamp(): string {
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    private formatMessage(entry: LogEntry): string {
        const levelStr = LogLevel[entry.level].padEnd(5);
        const componentStr = entry.component ? `[${entry.component}] ` : '';
        const metaStr = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';

        return `${entry.timestamp} ${levelStr} ${componentStr}${entry.message}${metaStr}`;
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.minLevel;
    }

    private writeLog(entry: LogEntry): void {
        const formattedMessage = this.formatMessage(entry);

        // Write to file
        try {
            fs.appendFileSync(this.currentLogFile, formattedMessage + '\n');
        } catch (error) {
            console.error('[Logger] Failed to write to log file:', error);
        }

        // Show in output channel for VS Code
        this.outputChannel.appendLine(formattedMessage);
    }

    public debug(message: string, component?: string, metadata?: any): void {
        if (!this.shouldLog(LogLevel.DEBUG)) return;

        this.writeLog({
            timestamp: this.formatTimestamp(),
            level: LogLevel.DEBUG,
            message,
            component,
            metadata
        });
    }

    public info(message: string, component?: string, metadata?: any): void {
        if (!this.shouldLog(LogLevel.INFO)) return;

        this.writeLog({
            timestamp: this.formatTimestamp(),
            level: LogLevel.INFO,
            message,
            component,
            metadata
        });
    }

    public warn(message: string, component?: string, metadata?: any): void {
        if (!this.shouldLog(LogLevel.WARN)) return;

        this.writeLog({
            timestamp: this.formatTimestamp(),
            level: LogLevel.WARN,
            message,
            component,
            metadata
        });
    }

    public error(message: string, component?: string, metadata?: any): void {
        if (!this.shouldLog(LogLevel.ERROR)) return;

        this.writeLog({
            timestamp: this.formatTimestamp(),
            level: LogLevel.ERROR,
            message,
            component,
            metadata
        });
    }

    public logWithEmoji(emoji: string, message: string, component?: string, metadata?: any): void {
        // For backward compatibility with existing emoji logging
        this.info(`${emoji} ${message}`, component, metadata);
    }

    public show(): void {
        this.outputChannel.show();
    }

    public getLogFilePath(): string {
        return this.currentLogFile;
    }

    public getRecentLogs(lines: number = 100): string[] {
        try {
            if (!fs.existsSync(this.currentLogFile)) {
                return [];
            }

            const content = fs.readFileSync(this.currentLogFile, 'utf8');
            const allLines = content.split('\n').filter(line => line.trim());

            return allLines.slice(-lines);
        } catch (error) {
            console.error('[Logger] Failed to read log file:', error);
            return [];
        }
    }

    public setMinLevel(level: LogLevel): void {
        this.minLevel = level;
        this.info(`Log level changed to ${LogLevel[level]}`, 'Logger');
    }
}