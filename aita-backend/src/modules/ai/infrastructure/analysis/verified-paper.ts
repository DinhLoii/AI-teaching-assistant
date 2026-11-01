/** Verified transcription keyed by source PDF bytes. Scoring always executes student code. */
export const verifiedPaper = {
  "sha256": "542796e8e7410b75f9b5439839ec6ba64e891a8915fe5a13540350cb693d7519",
  "pageCount": 5,
  "text": "PRF192 Practical Exam - Paper 7\nProgramming language: C\nConsole / standard input and standard output\n\nQuestion 1\n(1 mark, file to be edited: Q1.c)\nCreate a C program that reads two positive real numbers W and H from standard input. Print the rectangle diagonal sqrt(W*W + H*H) rounded to two decimal places.\nTest cases:\nTest case 1\n3.5 4.2\nOUTPUT:\n5.47\nTest case 2\n5.0 12.0\nOUTPUT:\n13.00\n\nQuestion 2\n(1 mark, file to be edited: Q2.c)\nCreate a C program that reads a positive integer N and prints the sum of its digits.\nTest cases:\nTest case 1\n1234\nOUTPUT:\n10\nTest case 2\n9999\nOUTPUT:\n36\n\nQuestion 3\n(1 mark, file to be edited: Q3.c)\nCreate a C program that reads N and then N integers. Select even numbers including zero, sort descending, print separated by single spaces. If none, print \"No even numbers among the N elements\", replacing N with the count.\nTest cases:\nTest case 1\n6\n3 8 1 4 10 7\nOUTPUT:\n10 8 4\nTest case 2\n4\n1 3 5 7\nOUTPUT:\nNo even numbers among the 4 elements\n\nQuestion 4\n(1 mark, file to be edited: Q4.c)\nCreate a C program that reads N and T, then N integers. Print every pair (arr[i], arr[j]) where i < j and their sum equals T. Use \"(x, y)\" on each line. If none, print \"No pair found\".\nTest cases:\nTest case 1\n5 9\n1 8 3 6 5\nOUTPUT:\n(1, 8)\n(3, 6)\nTest case 2\n4 100\n1 2 3 4\nOUTPUT:\nNo pair found\n\nQuestion 5\n(2 mark, file to be edited: Q5.c)\nCreate a C program that reads N records of weight and height. If any weight <= 0 or height <= 0 or height > 3.0, print \"Invalid input\" and stop. Otherwise compute BMI = weight / (height * height). Print Underweight if BMI < 18.5, Normal if 18.5 <= BMI < 25, Overweight if 25 <= BMI < 30, Obese otherwise. Validate all input before printing classifications.\nTest cases:\nTest case 1\n3\n70 1.75\n50 1.60\n95 1.70\nOUTPUT:\nNormal\nUnderweight\nObese\nTest case 2\n4\n45 1.65\n65 1.68\n80 1.72\n110 1.75\nOUTPUT:\nUnderweight\nNormal\nOverweight\nObese\nTest case 3\n3\n60 1.70\n0 1.65\nOUTPUT:\nInvalid input\nTest case 4\n2\n70 3.2\nOUTPUT:\nInvalid input\n\nQuestion 6\n(2 mark, file to be edited: Q6.c)\nCreate a C program that reads N names. Print names that are palindromes ignoring case, preserving their spelling and input order. Print \"Total palindromes: k\" last. If none, first print \"No palindrome found\".\nTest cases:\nTest case 1\n5\nAna Bob Eve Ava Tim\nOUTPUT:\nAna\nBob\nEve\nAva\nTotal palindromes: 4\nTest case 2\n4\nLevel Racecar John Noon\nOUTPUT:\nLevel\nRacecar\nNoon\nTotal palindromes: 3\nTest case 3\n3\nAlice\nTom\nJohn\nOUTPUT:\nNo palindrome found\nTotal palindromes: 0\n\nQuestion 7\n(2 mark, file to be edited: Q7.c)\nCreate a C program that reads N student records: StudentID Name Score1 Score2 Score3. TotalScore = Score1+Score2+Score3. Read option: 1 prints descending ranking as \"1. ID Name Total\"; 2 prints students strictly above the average total in input order as \"ID Name Total\"; other options print \"Invalid option\". N > 0 and each score is between 0 and 100.\nTest cases:\nTest case 1\n4\nS01 Alice 80 90 85\nS02 Bob 70 65 75\nS03 Carol 95 88 92\nS04 Dave 60 70 65\n1\nOUTPUT:\n1. S03 Carol 275\n2. S01 Alice 255\n3. S02 Bob 210\n4. S04 Dave 195\nTest case 2\n4\nS01 Alice 80 90 85\nS02 Bob 70 65 75\nS03 Carol 95 88 92\nS04 Dave 60 70 65\n2\nOUTPUT:\nS01 Alice 255\nS03 Carol 275\nTest case 3\n4\nS01 Alice 80 90 85\nS02 Bob 70 65 75\nS03 Carol 95 88 92\nS04 Dave 80 90 85\n2\nOUTPUT:\nS01 Alice 255\nS03 Carol 275\nS04 Dave 255\nTest case 4\n3\nSV001 Alice 80 90 70\nSV002 Bob 60 70 80\nSV003 Charlie 90 85 95\n5\nOUTPUT:\nInvalid option\n\n",
  "notice": "Bản trích xuất tham chiếu đã đối chiếu với PDF gốc theo SHA-256. Q5-TC1 trong đề gốc có BMI 50/1.60² = 19.53 (Normal) nhưng expected ghi Underweight; giữ nguyên mẫu gốc và cần giảng viên xác nhận.",
  "rubricDetails": {
    "Q1.c": {
      "title": "Tính đường chéo hình chữ nhật",
      "requirement": "Đọc hai số thực dương W và H; tính D = sqrt(W² + H²) và in kết quả với đúng 2 chữ số thập phân.",
      "failure": "Sai công thức đường chéo, đọc sai dữ liệu hoặc in sai độ chính xác/định dạng."
    },
    "Q2.c": {
      "title": "Tính tổng các chữ số",
      "requirement": "Đọc số nguyên dương N; xử lý toàn bộ các chữ số để tính tổng và in đúng kết quả.",
      "failure": "Chỉ lấy chữ số cuối, bỏ sót chữ số hoặc tính/in sai tổng."
    },
    "Q3.c": {
      "title": "Lọc và sắp xếp số chẵn",
      "requirement": "Đọc N phần tử; chọn các số chẵn kể cả 0, sắp xếp giảm dần và in cách nhau một dấu cách. Khi không có số chẵn, in \"No even numbers among the N elements\" với N thực tế.",
      "failure": "Lọc sai số chẵn, bỏ số 0, sắp xếp sai thứ tự hoặc thiếu/sai thông báo khi không có kết quả."
    },
    "Q4.c": {
      "title": "Tìm các cặp có tổng bằng T",
      "requirement": "Đọc N, T và dãy số; tìm tất cả cặp có i < j và a[i] + a[j] = T. In mỗi cặp theo dạng \"(x, y)\" trên một dòng; nếu không có, in \"No pair found\".",
      "failure": "Bỏ sót cặp, xét trùng hoặc sai điều kiện i < j, in sai định dạng hoặc thiếu thông báo không tìm thấy."
    },
    "Q5.c": {
      "title": "Kiểm tra dữ liệu và phân loại BMI",
      "requirement": "Đọc N bản ghi cân nặng/chiều cao. Nếu cân nặng ≤ 0 hoặc chiều cao không thuộc (0, 3.0], chỉ in \"Invalid input\" và dừng. Với dữ liệu hợp lệ, tính BMI = weight / height² và phân loại theo các mốc 18.5, 25.0, 30.0; mỗi người một dòng.",
      "failure": "Không kiểm tra toàn bộ dữ liệu trước khi in, sai công thức/ngưỡng BMI hoặc sai thông báo dữ liệu không hợp lệ."
    },
    "Q6.c": {
      "title": "Tìm tên đối xứng",
      "requirement": "Đọc N tên; kiểm tra palindrome không phân biệt hoa thường. In các tên đạt theo thứ tự nhập và giữ nguyên cách viết, rồi in \"Total palindromes: k\". Nếu không có, in \"No palindrome found\" trước dòng tổng.",
      "failure": "So sánh sai hoa/thường, bỏ sót tên, đổi thứ tự/cách viết hoặc thiếu/sai thông báo và tổng số tên đối xứng."
    },
    "Q7.c": {
      "title": "Xếp hạng và lọc sinh viên",
      "requirement": "Đọc mã, tên và 3 điểm của mỗi sinh viên; tính TotalScore. Lựa chọn 1: xếp hạng giảm dần theo tổng điểm, in thứ hạng/mã/tên/tổng. Lựa chọn 2: in sinh viên có tổng lớn hơn trung bình theo thứ tự nhập. Lựa chọn khác: in \"Invalid option\".",
      "failure": "Tính sai tổng/trung bình, xếp hạng sai, dùng ≥ thay vì > khi lọc, xử lý sai lựa chọn hoặc in sai định dạng."
    }
  }
} as const
