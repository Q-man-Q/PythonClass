/**
 * School presets for Python lessons
 */

export const PRESETS = [
  {
    id: 'variables',
    name: '1. Переменные и арифметика',
    icon: '📦',
    description: 'Урок 1: Создание переменных, сложение и вывод результата',
    code: `# Знакомство с переменными в Python!
# Переменная — это коробочка с именем в памяти компьютера.

a = 10
b = 5

# Складываем значения из коробочек a и b:
c = a + b

# Печатаем результат на экран:
print("Сумма чисел a и b равна:", c)
`
  },
  {
    id: 'conditions',
    name: '2. Проверка условий (if-elif-else)',
    icon: '⚖️',
    description: 'Урок 2: Компьютер принимает решения на основе условий',
    code: `# Проверка оценки ученика за контрольную работу!
points = 85

if points >= 90:
    grade = 5
    status = "Отлично!"
elif points >= 75:
    grade = 4
    status = "Хорошо!"
elif points >= 60:
    grade = 3
    status = "Удовлетворительно"
else:
    grade = 2
    status = "Нужно подучить материал"

print("Твоя оценка:", grade, "-", status)
`
  },
  {
    id: 'for_loop',
    name: '3. Цикл for и range (Сумма чисел)',
    icon: '🔁',
    description: 'Урок 3: Повторение действий с помощью цикла for',
    code: `# Считаем сумму чисел от 1 до 5 с помощью цикла for!
total = 0

# range(1, 6) создаёт числа 1, 2, 3, 4, 5
for number in range(1, 6):
    total = total + number
    print("Добавили число", number, "-> Текущая сумма:", total)

print("Финальный результат:", total)
`
  },
  {
    id: 'while_loop',
    name: '4. Цикл while (Обратный отсчёт ракеты)',
    icon: '🚀',
    description: 'Урок 4: Цикл, который работает, пока истинно условие',
    code: `# Обратный отсчёт перед запуском космической ракеты!
seconds = 4

while seconds > 0:
    print("До старта осталось:", seconds)
    seconds = seconds - 1

print("0! Поехали! Ракета летит в космос! 🌌")
`
  },
  {
    id: 'lists',
    name: '5. Списки и добавление элементов',
    icon: '📋',
    description: 'Урок 5: Хранение нескольких элементов в одном списке',
    code: `# Список фруктов для школьного праздника!
fruits = ["яблоко", "банан"]

print("В корзине сейчас:", fruits)

# Добавляем апельсин в конец списка:
fruits.append("апельсин")

# Добавляем клубнику:
fruits.append("клубника")

print("Всего фруктов в корзине:", len(fruits))
print("Первый фрукт:", fruits[0])
print("Итоговый список:", fruits)
`
  },
  {
    id: 'functions',
    name: '6. Собственные функции (def)',
    icon: '🛠️',
    description: 'Урок 6: Создание функции и передача аргументов',
    code: `# Создаём собственную функцию для вычисления площади прямоугольника:
def calc_area(width, height):
    area = width * height
    return area

# Вызываем функцию с разными размерами:
room_area = calc_area(4, 5)
print("Площадь комнаты 4x5 метров равна:", room_area)

yard_area = calc_area(10, 8)
print("Площадь двора 10x8 метров равна:", yard_area)
`
  },
  {
    id: 'interactive_input',
    name: '7. Диалог с пользователем (input)',
    icon: '💬',
    description: 'Урок 7: Получение данных от пользователя с клавиатуры',
    code: `# Компьютер знакомится с учеником!
name = input("Как тебя зовут? ")
age_str = input("Сколько тебе лет? ")

# Превращаем текст в число:
age = int(age_str)
next_age = age + 1

print("Привет,", name, "! Рад знакомству!")
print("В следующем году тебе исполнится:", next_age)
`
  },
  {
    id: 'game_guess',
    name: '8. Мини-игра: Проверка числа',
    icon: '🎮',
    description: 'Урок 8: Компьютер сравнивает догадку игрока',
    code: `# Загаданное компьютером секретное число:
secret = 7
guess = 7

if guess == secret:
    print("Ура! Ты угадал секретное число 7! 🏆")
elif guess < secret:
    print("Твоё число слишком маленькое!")
else:
    print("Твоё число слишком большое!")
`
  }
];
