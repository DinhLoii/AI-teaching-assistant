/**
 * Unit Tests for the submission similarity service.
 *
 * The two properties that matter: a disguised copy still scores high (renaming every
 * identifier and stripping the comments must not help), and two students who solved
 * the same exercise independently do NOT get flagged.
 */

import { describe, test, expect } from '@jest/globals'
import { normalizeSource, fingerprint, similarityPercent } from './submission-similarity.service.js'

const ORIGINAL = `
#include <stdio.h>
// compute factorial of a number
int factorial(int n) {
    if (n <= 1) return 1;
    int result = 1;
    for (int i = 2; i <= n; i++) {
        result = result * i;
    }
    return result;
}
int main() {
    int number;
    printf("Enter a number: ");
    scanf("%d", &number);
    printf("Factorial is %d\\n", factorial(number));
    return 0;
}
`

/** Comments removed, reindented, prompt strings translated. */
const COSMETIC_COPY = `
#include <stdio.h>
int factorial(int n) {
if (n <= 1) return 1;
int result = 1;
for (int i = 2; i <= n; i++) { result = result * i; }
return result;
}
int main() {
int number;
printf("Nhap so: ");
scanf("%d", &number);
printf("Ket qua %d\\n", factorial(number));
return 0;
}
`

/** Same program, every identifier renamed. */
const RENAMED_COPY = `
#include <stdio.h>
int fact(int x) {
    if (x <= 1) return 1;
    int acc = 1;
    for (int k = 2; k <= x; k++) {
        acc = acc * k;
    }
    return acc;
}
int main() {
    int val;
    printf("Enter a number: ");
    scanf("%d", &val);
    printf("Factorial is %d\\n", fact(val));
    return 0;
}
`

/** Same exercise, solved independently: recursion instead of a loop, different I/O. */
const INDEPENDENT_SOLUTION = `
#include <stdio.h>
int fact(int n) {
    if (n == 0) return 1;
    return n * fact(n - 1);
}
int main() {
    int input = 0;
    while (input <= 0) {
        printf("Please enter a positive integer: ");
        scanf("%d", &input);
    }
    int answer = fact(input);
    printf("%d! = %d\\n", input, answer);
    return 0;
}
`

const UNRELATED = `
import java.util.*;
public class BankAccount {
    private double balance;
    public BankAccount(double opening) { this.balance = opening; }
    public void deposit(double amount) {
        if (amount > 0) { balance += amount; }
    }
    public boolean withdraw(double amount) {
        if (amount > balance) return false;
        balance -= amount;
        return true;
    }
    public double getBalance() { return balance; }
}
`

function printsOf(source: string): Set<number> {
    const result = fingerprint(normalizeSource(source))
    expect(result.prints).not.toBeNull()
    return result.prints as Set<number>
}

function score(a: string, b: string): number {
    return similarityPercent(printsOf(a), printsOf(b))
}

describe('SubmissionSimilarityService', () => {
    describe('similarityPercent', () => {
        test('a file compared with itself scores 100', () => {
            expect(score(ORIGINAL, ORIGINAL)).toBe(100)
        })

        test('stripping comments and reformatting does not lower the score', () => {
            expect(score(ORIGINAL, COSMETIC_COPY)).toBeGreaterThanOrEqual(90)
        })

        test('renaming every identifier does not hide the copy', () => {
            // This is the case char-level k-grams miss entirely — they score it 0.
            expect(score(ORIGINAL, RENAMED_COPY)).toBeGreaterThanOrEqual(80)
        })

        test('an independent solution to the same exercise is not flagged', () => {
            expect(score(ORIGINAL, INDEPENDENT_SOLUTION)).toBeLessThan(50)
        })

        test('unrelated code scores near zero', () => {
            expect(score(ORIGINAL, UNRELATED)).toBeLessThan(20)
        })

        test('an empty fingerprint set never reports a match', () => {
            expect(similarityPercent(new Set<number>(), printsOf(ORIGINAL))).toBe(0)
        })
    })

    describe('normalizeSource', () => {
        test('removes block, line, hash and sql comments', () => {
            const normalized = normalizeSource(`
                /* block secret */
                int a = 1; // trailing secret
                # hash secret
                -- sql secret
            `)
            expect(normalized).not.toContain('secret')
        })

        test('the // inside a url does not swallow the rest of the line', () => {
            // String bodies are deliberately emptied, so the url itself is gone; what
            // must survive is the code after it.
            const normalized = normalizeSource('const u = "https://x.dev/a"; int b = 2; return b;')
            expect(normalized).toContain('int b')
            expect(normalized).toContain('return b')
        })

        test('a real line comment is removed but the next line survives', () => {
            const normalized = normalizeSource('int a = 1; // secret note\nint b = 2;')
            expect(normalized).not.toContain('secret')
            expect(normalized).toContain('int b')
        })
    })

    describe('fingerprint', () => {
        test('reports no prints for source too short to fingerprint', () => {
            expect(fingerprint(normalizeSource('int a;')).prints).toBeNull()
        })
    })
})
