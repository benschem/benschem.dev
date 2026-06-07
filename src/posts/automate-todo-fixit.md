---
title: A TODO workflow that lives in your codebase
description: A lightweight approach to tracking TODO and FIXIT comments throughout a codebase using a simple rake task — no Trello, no GitHub Issues.
published: 2025-03-16
draft: true
---

Track workflow in the github repo

Keep it super simple - no kanban, trello, gh issues etc

Add these comments throughout your codebase
A TODO: is any features, enhacements, wishlist, next steps, pseudocode, bugs, errors, needs optimising, needs rewriting

They can reference an overall task or an actionable item

No categories like "planned", "in progress" or "completed"
Everything planned is a todo, and everything completed simply has the comment removed and so will disappear from the md file.

setup a rake task
rake dev:todo

desc "Collect TODO comments from the codebase and save to TODO.md"
task :todo do
todo_list = []

Dir.glob("\*_/_", File::FNM_DOTMATCH).each do |file|
next if File.directory?(file) || file.match?(/node_modules|\.git|\.lock$/)

    File.readlines(file).each_with_index do |line, index|
      if line.include?("TODO")
        todo_list << "#{file}:#{index + 1}: #{line.strip}"
      end
    end

end

Great, it looks like this

# TODOs

app/controllers/questions_controller.rb:8: # TODO: Questions should have a countdown timer that autosubmits no guess if the time runs out
app/models/user.rb:8: # TODO: Users should be able to create accounts
app/models/user.rb:9: # TODO: Users should be able to add each other as friends
spec/models/answer_spec.rb:51: it 'TODO: Checks if a Guess for this Answer exists for a User' do
spec/models/answer_spec.rb:61: it 'TODO: Calculates how many times this Answer has been guessed' do

Now we need another rake task to setup a pre-commit git task so that our todos are updated on every commit:

task :install_git_hooks do
hook_path = ".git/hooks/pre-commit"
hook_content = <<~HOOK
#!/bin/sh
rake dev:todo
rake dev:fixme
git add TODO.md
git add FIXME.md
HOOK

File.write(hook_path, hook_content)
File.chmod(0755, hook_path) # Make it executable

puts "✅ Pre-commit hook installed!"
end

Maybe we should include this in a bin/setup command for all devs to run all the rake tasks and have the same stuff.

It's just me so another time.

What if we wanted to dump the todos to a .yaml file with some nicer formatting?

todos:

- file: "app/controllers/questions_controller.rb"
  count: 1
  todos:
  - line: 8
    todo: "Questions should have a countdown timer that autosubmits no guess if the time runs out"
- file: "app/models/user.rb"
  count: 2
  todos:
  - line: 8
    todo: "Users should be able to create accounts"
  - line: 9
    todo: "Users should be able to add each other as friends"
- file: "spec/models/answer_spec.rb"
  count: 2
  todos:
  - line: 51
    todo: "Checks if a Guess for this Answer exists for a User"
  - line: 61
    todo: "Calculates how many times this Answer has been guessed"

Then we could include other categories, like #FIXIT, #BUG #WISHLIST etc

And then what if we made an embedded front end to display our todos?

Ok no - we've gone too far, stick with single line .md file and get back to work.
