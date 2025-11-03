/**
 * TimerRegistry Tests
 */

import { TimerRegistry } from '../../extension/kernel/TimerRegistry';

describe('TimerRegistry', () => {
    let registry: TimerRegistry;
    
    beforeEach(() => {
        registry = new TimerRegistry();
    });
    
    afterEach(() => {
        registry.clearAll();
    });
    
    test('should register and clear timeout', (done) => {
        let called = false;
        
        registry.registerTimeout('test:timeout', () => {
            called = true;
        }, 10);
        
        const count1 = registry.getActiveCount();
        expect(count1.timeouts).toBe(1);
        
        setTimeout(() => {
            expect(called).toBe(true);
            const count2 = registry.getActiveCount();
            expect(count2.timeouts).toBe(0); // Auto-cleaned
            done();
        }, 50);
    });
    
    test('should register and clear interval', () => {
        let callCount = 0;
        
        registry.registerInterval('test:interval', () => {
            callCount++;
        }, 10);
        
        const count = registry.getActiveCount();
        expect(count.intervals).toBe(1);
        
        registry.clear('test:interval');
        const count2 = registry.getActiveCount();
        expect(count2.intervals).toBe(0);
    });
    
    test('should clear all timers', () => {
        registry.registerTimeout('t1', () => {}, 1000);
        registry.registerTimeout('t2', () => {}, 1000);
        registry.registerInterval('i1', () => {}, 1000);
        registry.registerInterval('i2', () => {}, 1000);
        
        const count1 = registry.getActiveCount();
        expect(count1.total).toBe(4);
        
        registry.clearAll();
        
        const count2 = registry.getActiveCount();
        expect(count2.total).toBe(0);
    });
    
    test('should throw on duplicate ID', () => {
        registry.registerInterval('dup', () => {}, 1000);
        
        expect(() => {
            registry.registerInterval('dup', () => {}, 1000);
        }).toThrow('Timer ID already registered: dup');
    });
    
    test('should provide metadata', () => {
        registry.registerInterval('test', () => {}, 5000);
        
        const timers = registry.getTimers();
        expect(timers.length).toBe(1);
        expect(timers[0].id).toBe('test');
        expect(timers[0].type).toBe('interval');
        expect(timers[0].interval).toBe(5000);
    });
});

