/** Transcribed from all six rendered pages; applies only to these exact PDF bytes. */
export const verifiedCirclePaper = {
 sha256: 'e9c258c6eb8906fefdf6bb1d54c9bf6f392926072c4a52c863695f74b81ad691',
 pageCount: 6,
 notice: 'Đã đối chiếu 6 trang PDF theo SHA-256, giữ khoảng cách và số liệu gốc. Q5-TC1 có mâu thuẫn: 50/1.60² là Normal nhưng mẫu ghi Underweight; cần giảng viên xác nhận trước khi dùng để chấm Q5.',
 text: `PRF192 Practical Exam - Circle and Products
Programming language: C
Console / standard input and standard output

Question 1
(1 mark, file to be edited: Q1.c)
Create a C program that reads positive radius R. Print circumference 2*pi*R and area pi*R*R on separate lines with two decimal places. Use pi = 3.14159265.
Test cases:
Test case 1
5.00
OUTPUT:
31.42
78.54
Test case 2
1.00
OUTPUT:
6.28
3.14

Question 2
(1 mark, file to be edited: Q2.c)
Create a C program that reads integers A and B (1 <= A <= B <= 200). Print all primes in [A, B] separated by single spaces. If none print "No prime found in [A, B]", substituting actual bounds.
Test cases:
Test case 1
1 20
OUTPUT:
2 3 5 7 11 13 17 19
Test case 2
24 28
OUTPUT:
No prime found in [24, 28]

Question 3
(1 mark, file to be edited: Q3.c)
Create a C program that reads N > 0 then N integers. Select even numbers including zero and sort descending. Print separated by single spaces. If none print "No even numbers among the N elements", substituting N.
Test cases:
Test case 1
6
3 8 1 4 10 7
OUTPUT:
10 8 4
Test case 2
4
1 3 5 7
OUTPUT:
No even numbers among the 4 elements

Question 4
(1 mark, file to be edited: Q4.c)
Create a C program that reads N >= 2 then N distinct integers. Print the second largest value and its zero-based index as "Second largest = value, index = index".
Test cases:
Test case 1
5
10 3 7 20 15
OUTPUT:
Second largest = 15, index = 4
Test case 2
4
10 30 20 40
OUTPUT:
Second largest = 30, index = 1

Question 5
(2 mark, file to be edited: Q5.c)
Create a C program that reads N person records, weight and height. Validate all records before output: weight > 0 and 0 < height <= 3.0. On invalid input print "Invalid input" and stop. Otherwise BMI = weight / height squared. Print one classification per line: Underweight below 18.5, Normal from 18.5 to below 25, Overweight from 25 to below 30, Obese at least 30.
Test cases:
Test case 1
3
70 1.75
50 1.60
95 1.70
OUTPUT:
Normal
Underweight
Obese
Test case 2
4
45 1.65
65 1.68
80 1.72
110 1.75
OUTPUT:
Underweight
Normal
Overweight
Obese
Test case 3
3
60 1.70
0 1.65
OUTPUT:
Invalid input
Test case 4
2
70 3.2
OUTPUT:
Invalid input

Question 6
(2 mark, file to be edited: Q6.c)
Create a C program that reads N names, letters only with no spaces. Count a,e,i,o,u case-insensitively. Print "Name: count vowel(s)" per name, then "Most vowels: Name". Ties select the first name.
Test cases:
Test case 1
3
Alice Bob Carol
OUTPUT:
Alice: 3 vowel(s)
Bob: 1 vowel(s)
Carol: 2 vowel(s)
Most vowels: Alice
Test case 2
4
Ana Eve Iris Uma
OUTPUT:
Ana: 2 vowel(s)
Eve: 2 vowel(s)
Iris: 2 vowel(s)
Uma: 2 vowel(s)
Most vowels: Ana
Test case 3
4
Dan Kim Leo Mia
OUTPUT:
Dan: 1 vowel(s)
Kim: 1 vowel(s)
Leo: 2 vowel(s)
Mia: 2 vowel(s)
Most vowels: Leo

Question 7
(2 mark, file to be edited: Q7.c)
Read N products: ProductID Name Price Stock. Price > 0, Stock >= 0. Read option: 1 prints products descending by Price*Stock as "ProductID Name Price(2dp) StockValue(2dp)"; 2 reads threshold T and prints products with Stock < T as "ProductID Name Stock"; other options print "Invalid option".
Test cases:
Test case 1
3
P01 Pen 2.5 100
P02 Bag 15.0 30
P03 Book 5.0 80
1
OUTPUT:
P02 Bag 15.00 450.00
P03 Book 5.00 400.00
P01 Pen 2.50 250.00
Test case 2
3
A01 Mug 4.5 200
A02 Cup 9.0 100
A03 Pen 2.0 50
1
OUTPUT:
A01 Mug 4.50 900.00
A02 Cup 9.00 900.00
A03 Pen 2.00 100.00
Test case 3
3
X01 Ghost 99.0 0
X02 Bolt 3.0 50
X03 Cap 8.0 20
1
OUTPUT:
X03 Cap 8.00 160.00
X02 Bolt 3.00 150.00
X01 Ghost 99.00 0.00
Test case 4
1
S01 Solo 7.5 40
1
OUTPUT:
S01 Solo 7.50 300.00
Test case 5
4
P01 Pen 2.5 100
P02 Bag 15.0 30
P03 Book 5.0 80
P04 Clip 1.0 10
2
50
OUTPUT:
P02 Bag 30
P04 Clip 10
Test case 6
2
P01 Pen 2.5 100
P02 Bag 15.0 30
5
OUTPUT:
Invalid option
`
} as const
