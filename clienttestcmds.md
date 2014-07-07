# Test Client commands

## valid signup
curl -X POST http://localhost:8080/users/signup -d 'email=waleed.ali@gmail.com&password=pass1234'
curl -X POST http://localhost:8080/users/signup -d 'email=waleed@gmail.com&password=hardPassword'

## invalid password
curl -X POST http://localhost:8080/users/signup -d 'email=waleed.ali@email.com&password=pass2'

## invalid email
curl -X POST http://localhost:8080/users/signup -d 'email=waleed.aliemail.com&password=pass1234'

## XSS example
curl -X POST http://localhost:8080/users/signup -d 'email=waleed.ali@gmail.com&password=pass1234<script>alert(/xss/);</script>'

## authentication and adding a post for this user
curl -u waleed.ali@gmail.com:pass1234 -X POST http://localhost:8080/posts/add -d 'title=New post&body=the post body';
curl -u waleed@gmail.com:hardPassword -X POST http://localhost:8080/posts/add -d 'title=New post title&body=the new post body';

## get my posts
curl -u waleed.ali@gmail.com:pass1234 http://localhost:8080/posts/get
curl -u waleed@gmail.com:hardPassword http://localhost:8080/posts/get

## file upload
curl -u waleed@gmail.com:hardPassword -F filedata=@Pictures/melting_dribble.png http://localhost:8080/files/upload

## get my files list
curl -u waleed@gmail.com:hardPassword http://localhost:8080/files/getmyfiles

## download a file
curl -u waleed@gmail.com:hardPassword http://localhost:8080/files/download/melting_dribble.png -O melting_dribble.png


