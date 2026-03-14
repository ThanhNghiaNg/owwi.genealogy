```python
    return b
```

### Step 5: Writing the Test Cases
To ensure the `fibonacci` function works as expected, we need to write several test cases that cover various scenarios, including edge cases and typical use cases. Here’s how you can write the test cases using `pytest`.

```python
import pytest

def fibonacci(n):
    """
    Calculate the nth Fibonacci number using an iterative approach.
    
    Parameters:
    n (int): The position in the Fibonacci sequence.
    
    Returns:
    int: The nth Fibonacci number.
    """
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

# Test cases using pytest
def test_fibonacci_0():
    assert fibonacci(0) == 0, "Fibonacci of 0 should be 0"

def test_fibonacci_1():
    assert fibonacci(1) == 1, "Fibonacci of 1 should be 1"

def test_fibonacci_positive():
    assert fibonacci(5) == 5, "Fibonacci of 5 should be 5"
    assert fibonacci(10) == 55, "Fibonacci of 10 should be 55"
    assert fibonacci(20) == 676