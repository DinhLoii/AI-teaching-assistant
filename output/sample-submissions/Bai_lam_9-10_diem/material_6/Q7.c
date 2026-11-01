#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

typedef struct {
    char id[256], name[256];
    int total;
} Student;
int main(void) {
    int n, option;
    long long sum = 0;
    if (scanf("%d", &n) != 1 || n <= 0) return 1;
    Student *students = malloc((size_t)n * sizeof(*students));
    if (!students) return 1;
    for (int i = 0; i < n; i++) {
        int a, b, c;
        if (scanf("%255s %255s %d %d %d", students[i].id, students[i].name, &a, &b, &c) != 5) { free(students); return 1; }
        students[i].total = a + b + c;
        sum += students[i].total;
    }
    if (scanf("%d", &option) != 1) { free(students); return 1; }
    if (option == 1) {
        /* Stable insertion sort keeps the input order for tied totals. */
        for (int i = 1; i < n; i++) {
            Student current = students[i];
            int j = i - 1;
            while (j >= 0 && students[j].total < current.total) { students[j + 1] = students[j]; j--; }
            students[j + 1] = current;
        }
        for (int i = 0; i < n; i++) printf("%d. %s %s %d\n", i + 1, students[i].id, students[i].name, students[i].total);
    } else if (option == 2) {
        for (int i = 0; i < n; i++) if ((long long)students[i].total * n > sum) printf("%s %s %d\n", students[i].id, students[i].name, students[i].total);
    } else puts("Invalid option");
    free(students);
    return 0;
}
